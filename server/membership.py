"""所属（ユーザー × アプリ → 会社）の共通モジュール。

運営管理ポータル（mebiteq-portal）が正本。各アプリ（estimate / nesting / kouzou / ajisai）は
このファイルをそのままコピーして取り込み、リクエストごとに `resolve(event, APP_ID)` で
「この人はこのアプリをどの会社として使えるか」を解決する（docs/user-app-membership.md）。

データ（テーブル: 環境変数 PORTAL_TABLE_NAME、既定 "mebiteq-portal-data"）:
  所属  PK=USER#<email小文字>  SK=APP#<appId>
        companyId / email / appId / name / role / isAdmin / isActive / createdAt / updatedAt
        role は "admin" | "staff" | "member" | "guest"（アプリごとに使う段階が違う。isAdmin = role=="admin" を常に同期）
        GSI1PK=COMPANY#<companyId>  GSI1SK=APP#<appId>#USER#<email>   （GSI "GSI1"）
  会社  PK=COMPANY#<companyId>  SK=PROFILE   （status が active 以外は利用不可。
        contracts[appId] は外販の契約＝docs/app-contracts-design.md）

判定（resolve）:
  1. claims の email で所属を引く。無い／isActive=false → AccessDenied(403)
  2. 会社の status が active 以外 → AccessDenied(403)
  3. そのアプリの契約が停止（contracts[appId].status == "suspended"）→ AccessDenied(403)
     （契約未登録＝社内利用・無償提供、trial / active は従来どおり通す。会社 "1" は契約を持たない）
  4. {companyId, isAdmin, email, name} を返す
  Lambda プロセス内で短時間キャッシュする（CACHE_TTL_SECONDS、既定 30 秒）。

本モジュールは boto3 以外に依存しない。ポータル固有の処理（Cognito 操作等）は持たない。
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

PORTAL_APP_ID = "portal"          # 運営管理ポータル自身の利用権限
OPS_COMPANY_ID = "1"              # 運営（メビテック）
ROLES = ("admin", "staff", "member", "guest")   # guest = 社外・閲覧のみ（使えるアプリは限定）
GSI_NAME = "GSI1"
CACHE_TTL_SECONDS = float(os.environ.get("MEMBERSHIP_CACHE_TTL", "30"))

_table = None
_cache: dict[tuple[str, str], tuple[float, dict | None]] = {}


class AccessDenied(Exception):
    """所属が無い・無効・会社停止など、アプリを利用できないときに投げる（HTTP 403 相当）。"""

    status_code = 403

    def __init__(self, message: str = "このアプリの利用権限がありません"):
        super().__init__(message)
        self.message = message

    def to_response(self) -> dict:
        """API Gateway（Lambda Proxy）用の 403 応答。各アプリの handler でそのまま返せる。"""
        return {
            "statusCode": self.status_code,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            },
            "body": json.dumps({"error": self.message, "code": "ACCESS_DENIED"}, ensure_ascii=False),
        }


# ==================== キー ====================

def normalize_email(email: str | None) -> str:
    return str(email or "").strip().lower()


def user_pk(email: str) -> str:
    return f"USER#{normalize_email(email)}"


def app_sk(app_id: str) -> str:
    return f"APP#{app_id}"


def company_gsi_pk(company_id: str) -> str:
    return f"COMPANY#{company_id}"


def company_gsi_sk(app_id: str, email: str) -> str:
    return f"APP#{app_id}#USER#{normalize_email(email)}"


def table():
    """所属テーブル（遅延生成。テストでは環境変数を先に設定しておく）。"""
    global _table
    if _table is None:
        name = os.environ.get("PORTAL_TABLE_NAME", "mebiteq-portal-data")
        _table = boto3.resource("dynamodb").Table(name)
    return _table


def reset_for_tests():
    """テーブル参照とキャッシュを捨てる（テスト用）。"""
    global _table
    _table = None
    _cache.clear()


# ==================== 所属の読み書き ====================

def role_of(item: dict) -> str:
    """レコードの役割。role 属性が無い旧レコードは isAdmin から導く。"""
    role = item.get("role")
    if role in ROLES:
        return role
    return "admin" if item.get("isAdmin") else "member"


def to_dict(item: dict | None) -> dict | None:
    if not item:
        return None
    role = role_of(item)
    return {
        "email": item.get("email"),
        "appId": item.get("appId"),
        "companyId": str(item.get("companyId")),
        "name": item.get("name") or "",
        "role": role,
        "isAdmin": role == "admin",
        "isActive": bool(item.get("isActive", True)),
        "createdAt": item.get("createdAt"),
        "updatedAt": item.get("updatedAt"),
    }


def get_membership(email: str, app_id: str) -> dict | None:
    resp = table().get_item(Key={"PK": user_pk(email), "SK": app_sk(app_id)})
    return to_dict(resp.get("Item"))


def create_membership(email: str, app_id: str, company_id: str, *,
                      name: str = "", is_admin: bool = False, is_active: bool = True,
                      role: str | None = None) -> dict:
    """所属を新規作成する。既に同じ (email, app) があれば ValueError。

    role を渡さなければ is_admin から admin/member を決める。
    """
    if role is None:
        role = "admin" if is_admin else "member"
    if role not in ROLES:
        raise ValueError(f"invalid role: {role}")
    email_n = normalize_email(email)
    now = datetime.now().isoformat()
    item = {
        "PK": user_pk(email_n),
        "SK": app_sk(app_id),
        "GSI1PK": company_gsi_pk(str(company_id)),
        "GSI1SK": company_gsi_sk(app_id, email_n),
        "email": email_n,
        "appId": app_id,
        "companyId": str(company_id),
        "name": name or "",
        "role": role,
        "isAdmin": role == "admin",
        "isActive": bool(is_active),
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        table().put_item(Item=item, ConditionExpression="attribute_not_exists(PK)")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise ValueError("membership already exists") from e
        raise
    _cache.pop((email_n, app_id), None)
    return to_dict(item)


def update_membership(email: str, app_id: str, **fields) -> dict | None:
    """name / role / isAdmin / isActive を更新する。所属が無ければ None。

    role と isAdmin は常に同期する。isAdmin だけ渡されたときは
    True→admin、False→（staff なら staff を維持、それ以外は member）。
    """
    allowed = {k: v for k, v in fields.items()
               if k in ("name", "role", "isAdmin", "isActive") and v is not None}
    if not allowed:
        return get_membership(email, app_id)
    if "role" in allowed:
        if allowed["role"] not in ROLES:
            raise ValueError(f"invalid role: {allowed['role']}")
        allowed["isAdmin"] = allowed["role"] == "admin"
    elif "isAdmin" in allowed:
        if allowed["isAdmin"]:
            allowed["role"] = "admin"
        else:
            current = get_membership(email, app_id)
            allowed["role"] = "staff" if current and current["role"] == "staff" else "member"
    names = {"#f%d" % i: k for i, k in enumerate(allowed)}
    values = {":v%d" % i: v for i, v in enumerate(allowed.values())}
    expr = "SET " + ", ".join(f"#f{i} = :v{i}" for i in range(len(allowed))) + ", updatedAt = :u"
    values[":u"] = datetime.now().isoformat()
    try:
        resp = table().update_item(
            Key={"PK": user_pk(email), "SK": app_sk(app_id)},
            UpdateExpression=expr,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ConditionExpression="attribute_exists(PK)",
            ReturnValues="ALL_NEW",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return None
        raise
    _cache.pop((normalize_email(email), app_id), None)
    return to_dict(resp.get("Attributes"))


def delete_membership(email: str, app_id: str) -> None:
    table().delete_item(Key={"PK": user_pk(email), "SK": app_sk(app_id)})
    _cache.pop((normalize_email(email), app_id), None)


def list_by_user(email: str) -> list[dict]:
    """その人の全所属（アプリ横断）。"""
    items = []
    kwargs = {"KeyConditionExpression": Key("PK").eq(user_pk(email)) & Key("SK").begins_with("APP#")}
    while True:
        resp = table().query(**kwargs)
        items.extend(resp.get("Items", []))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek
    return [to_dict(i) for i in items]


def list_by_company(company_id: str, app_id: str | None = None) -> list[dict]:
    """会社の所属一覧。app_id を渡すとそのアプリだけ。"""
    cond = Key("GSI1PK").eq(company_gsi_pk(str(company_id)))
    if app_id:
        cond = cond & Key("GSI1SK").begins_with(f"APP#{app_id}#")
    items = []
    kwargs = {"IndexName": GSI_NAME, "KeyConditionExpression": cond}
    while True:
        resp = table().query(**kwargs)
        items.extend(resp.get("Items", []))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek
    return [to_dict(i) for i in items]


def count_active(company_id: str, app_id: str) -> int:
    """会社 × アプリの有効所属数（席数カウント）。"""
    return sum(1 for m in list_by_company(company_id, app_id) if m["isActive"])


# ==================== 会社 ====================

def get_company(company_id: str) -> dict | None:
    resp = table().get_item(Key={"PK": f"COMPANY#{company_id}", "SK": "PROFILE"})
    return resp.get("Item")


def company_is_active(company_id: str) -> bool:
    """会社が利用可能か。運営会社 "1" は常に可（ポータルからも停止できない）。"""
    if str(company_id) == OPS_COMPANY_ID:
        return True
    item = get_company(company_id)
    return bool(item) and item.get("status", "active") == "active"


# ==================== リクエストからの解決 ====================

def extract_claims(event: dict | None) -> dict:
    """API Gateway の JWT claims（REST: authorizer.claims / HTTP API: authorizer.jwt.claims）。"""
    try:
        auth = ((event or {}).get("requestContext") or {}).get("authorizer") or {}
        return (auth.get("claims") or (auth.get("jwt") or {}).get("claims") or {})
    except Exception:
        return {}


def caller_email(event: dict | None) -> str:
    """リクエスト元のメール（所属を引くキー）。確認できなければ空文字。

    email クレームがあるときは email_verified が真（"true" / True）の場合だけ使う。
    """
    claims = extract_claims(event)
    email = claims.get("email")
    if email:
        # 未確認のメールは利用者が自分で書き換えた値かもしれないので、本人の確認には使わない
        if str(claims.get("email_verified", "")).lower() != "true":
            return ""
        return normalize_email(email)
    return normalize_email(claims.get("cognito:username"))


def lookup(email: str, app_id: str) -> dict | None:
    """所属をキャッシュ付きで引く（会社の状態は見ない）。"""
    key = (normalize_email(email), app_id)
    now = time.monotonic()
    hit = _cache.get(key)
    if hit and hit[0] > now:
        return hit[1]
    m = get_membership(email, app_id)
    _cache[key] = (now + CACHE_TTL_SECONDS, m)
    return m


def resolve(event: dict | None, app_id: str) -> dict:
    """リクエスト元がこのアプリをどの会社として使えるかを返す。使えなければ AccessDenied。

    戻り値: {"email", "companyId", "isAdmin", "name"}
    """
    email = caller_email(event)
    if not email:
        raise AccessDenied("ログイン情報を確認できません")
    m = lookup(email, app_id)
    if not m or not m["isActive"]:
        raise AccessDenied("このアプリの利用権限がありません。運営にお問い合わせください")
    if str(m["companyId"]) != OPS_COMPANY_ID:
        company = get_company(m["companyId"])
        if not company or company.get("status", "active") != "active":
            raise AccessDenied("所属会社の利用が停止されています")
        contract = (company.get("contracts") or {}).get(app_id)
        if contract and contract.get("status") == "suspended":
            raise AccessDenied("このアプリの契約が停止されています。運営にお問い合わせください")
    return {"email": email, "companyId": m["companyId"], "isAdmin": m["isAdmin"], "name": m["name"]}
