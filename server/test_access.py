import json
import sys
from pathlib import Path
import pytest
import boto3
from moto import mock_aws

sys.path.insert(0, str(Path(__file__).parent))
import index
import membership


@pytest.fixture(autouse=True)
def database(monkeypatch):
    for key, value in {'AWS_ACCESS_KEY_ID':'testing','AWS_SECRET_ACCESS_KEY':'testing',
                       'AWS_DEFAULT_REGION':'ap-northeast-1','CLIENT_ID':'client',
                       'PORTAL_TABLE_NAME':'test-portal','ALLOWED_ORIGINS':'https://pipe-support.mebiteq.jp'}.items():
        monkeypatch.setenv(key, value)
    with mock_aws():
        table = boto3.resource('dynamodb').create_table(TableName='test-portal',
            KeySchema=[{'AttributeName':'PK','KeyType':'HASH'},{'AttributeName':'SK','KeyType':'RANGE'}],
            AttributeDefinitions=[{'AttributeName':'PK','AttributeType':'S'},{'AttributeName':'SK','AttributeType':'S'}],
            BillingMode='PAY_PER_REQUEST')
        membership.reset_for_tests()
        monkeypatch.setattr(membership, 'CACHE_TTL_SECONDS', 0)
        table.put_item(Item={'PK':'COMPANY#2','SK':'PROFILE','status':'active','apps':['pipesupport']})
        membership.create_membership('member@example.test','pipesupport','2',role='member')
        yield table
        membership.reset_for_tests()


def event(**claims):
    return {'httpMethod':'GET','resource':'/me','headers':{'Origin':'https://pipe-support.mebiteq.jp'},
            'requestContext':{'authorizer':{'claims':{'email':'member@example.test','email_verified':'true',
                'sub':'user-1','aud':'client','token_use':'id',**claims}}}}


def test_active_member():
    reply=index.handler(event(),None)
    assert reply['statusCode']==200
    actor=json.loads(reply['body'])
    assert actor['companyId']=='2' and actor['role']=='member' and not actor['isAdmin']
    assert actor['appId']=='pipesupport' and actor['userId']=='user-1'
    assert reply['headers']['Cache-Control']=='no-store'


@pytest.mark.parametrize('claims',[{'email_verified':'false'},{'aud':'other-client'},
    {'token_use':'access'},{'email':''},{'sub':''}])
def test_invalid_identity(claims):
    assert index.handler(event(**claims),None)['statusCode']==401


def test_membership_revocation_immediate():
    assert index.handler(event(),None)['statusCode']==200
    membership.update_membership('member@example.test','pipesupport',isActive=False)
    assert index.handler(event(),None)['statusCode']==403


def test_unregistered_and_other_app():
    membership.delete_membership('member@example.test','pipesupport')
    membership.create_membership('member@example.test','kouzou','2')
    assert index.handler(event(),None)['statusCode']==403


@pytest.mark.parametrize('record',[None,{'status':'suspended'},
    {'status':'active','contracts':{'pipesupport':{'status':'suspended'}}}])
def test_company_and_contract_stops(database,record):
    database.delete_item(Key={'PK':'COMPANY#2','SK':'PROFILE'})
    if record is not None:database.put_item(Item={'PK':'COMPANY#2','SK':'PROFILE',**record})
    assert index.handler(event(),None)['statusCode']==403


def test_failure_is_closed(monkeypatch):
    def unavailable(*args):raise RuntimeError('secret infrastructure details')
    monkeypatch.setattr(membership,'resolve',unavailable)
    reply=index.handler(event(),None)
    assert reply['statusCode']==503 and 'secret' not in reply['body']


def test_cors_and_options():
    e=event();e['headers']['Origin']='https://untrusted.example';e['httpMethod']='OPTIONS'
    reply=index.handler(e,None)
    assert reply['statusCode']==204 and 'Access-Control-Allow-Origin' not in reply['headers']
