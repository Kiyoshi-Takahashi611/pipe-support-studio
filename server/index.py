"""GET /me: Cognitoで検証済みの本人と運営ポータルの所属を照合する。"""
import json
import os
import logging
import membership

APP_ID = 'pipesupport'


def handler(event, context):
    origins = os.environ.get('ALLOWED_ORIGINS', '').split(',')
    origin = next((v for k, v in (event.get('headers') or {}).items() if k.lower() == 'origin'), '')
    headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
               'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET,OPTIONS',
               'Access-Control-Allow-Headers': 'Authorization,Content-Type'}
    if origin and origin in origins:
        headers['Access-Control-Allow-Origin'] = origin

    def reply(status, body):
        return {'statusCode': status, 'headers': headers, 'body': json.dumps(body, ensure_ascii=False)}

    if event.get('httpMethod') == 'OPTIONS':
        return reply(204, None)
    if event.get('httpMethod') != 'GET' or event.get('resource') != '/me':
        return reply(404, {'message': '経路が見つかりません'})
    claims = membership.extract_claims(event)
    # API Gateway validates issuer/signature/expiry/audience. Keep an audience and
    # verified-email check here as well; do not fall back to an unverified username.
    if not claims.get('sub') or not claims.get('email') or str(claims.get('email_verified')).lower() != 'true' \
            or claims.get('token_use') != 'id' or claims.get('aud') != os.environ.get('CLIENT_ID'):
        return reply(401, {'message': 'ログイン情報を確認できません'})
    try:
        actor = membership.resolve(event, APP_ID)
        member = membership.lookup(actor['email'], APP_ID)
        return reply(200, {**actor, 'appId': APP_ID, 'userId': claims['sub'],
                           'role': member['role'] if member else 'member'})
    except membership.AccessDenied as error:
        return reply(403, {'message': error.message})
    except Exception:
        logging.exception('Membership lookup failed')
        return reply(503, {'message': '利用権限を確認できません。時間をおいて再確認してください。'})
