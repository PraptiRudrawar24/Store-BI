import urllib.request
import json

def test_login(email, password):
    req = urllib.request.Request(
        'http://127.0.0.1:8000/auth/login',
        data=json.dumps({'email': email, 'password': password}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Success for {email}: status={response.status}, shop={data.get('shop', {}).get('name')}")
    except Exception as e:
        print(f"Error for {email}: {e}")

if __name__ == '__main__':
    test_login('admin@storebi.com', 'Admin@1234')
    test_login('prapti@storebi.com', 'Prapti@1234')
