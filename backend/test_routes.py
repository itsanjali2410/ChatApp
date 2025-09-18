#!/usr/bin/env python3
from app.main import app

print("App routes:")
for route in app.routes:
    if hasattr(route, 'path'):
        methods = getattr(route, 'methods', 'N/A')
        print(f"  {route.path} - {methods}")
    elif hasattr(route, 'prefix'):
        print(f"  {route.prefix} - Mount")
