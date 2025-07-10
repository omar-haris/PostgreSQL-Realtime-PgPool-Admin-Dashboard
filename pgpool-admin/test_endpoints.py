#!/usr/bin/env python3
"""
Test script to verify all API endpoints are working correctly
"""

import requests
import sys
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:9000"

def test_login():
    """Test login endpoint"""
    try:
        response = requests.post(f"{BASE_URL}/login", data={
            'username': 'admin',
            'password': 'admin'
        }, allow_redirects=False)
        
        if response.status_code in [200, 302]:
            print("✅ Login endpoint working")
            return response.cookies
        else:
            print(f"❌ Login failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_api_endpoints(cookies):
    """Test all API endpoints"""
    endpoints = [
        "/api/stats",
        "/api/pool_nodes", 
        "/api/pool_status",
        "/api/pool_processes",
        "/api/pool_pools",
        "/api/query_statistics",
        "/api/database_statistics",
        "/api/performance_insights",
        "/api/health_check"
    ]
    
    results = {}
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", cookies=cookies, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if 'error' in data:
                        results[endpoint] = f"⚠️  API Error: {data['error']}"
                    else:
                        results[endpoint] = "✅ Working"
                except:
                    results[endpoint] = "✅ Working (non-JSON)"
            elif response.status_code == 302:
                results[endpoint] = "❌ Authentication required"
            else:
                results[endpoint] = f"❌ HTTP {response.status_code}"
                
        except Exception as e:
            results[endpoint] = f"❌ Error: {str(e)}"
    
    return results

def test_pages(cookies):
    """Test page routes"""
    pages = [
        "/dashboard",
        "/nodes", 
        "/performance",
        "/queries",
        "/insights",
        "/console",
        "/history"
    ]
    
    results = {}
    
    for page in pages:
        try:
            response = requests.get(f"{BASE_URL}{page}", cookies=cookies, timeout=10)
            
            if response.status_code == 200:
                results[page] = "✅ Loading"
            elif response.status_code == 302:
                results[page] = "❌ Redirecting (auth issue)"
            else:
                results[page] = f"❌ HTTP {response.status_code}"
                
        except Exception as e:
            results[page] = f"❌ Error: {str(e)}"
    
    return results

def test_static_files():
    """Test static file access"""
    static_files = [
        "/static/css/main.css",
        "/static/js/common.js",
        "/static/js/dashboard.js",
        "/static/js/performance.js",
        "/static/js/nodes.js",
        "/static/js/queries.js",
        "/static/js/insights.js",
        "/static/js/console.js",
        "/static/js/history.js"
    ]
    
    results = {}
    
    for file in static_files:
        try:
            response = requests.get(f"{BASE_URL}{file}", timeout=5)
            
            if response.status_code == 200:
                results[file] = "✅ Available"
            else:
                results[file] = f"❌ HTTP {response.status_code}"
                
        except Exception as e:
            results[file] = f"❌ Error: {str(e)}"
    
    return results

def main():
    print("🔍 Testing PgPool Admin Dashboard Endpoints\n")
    
    # Test login
    print("1. Testing Authentication...")
    cookies = test_login()
    
    if not cookies:
        print("❌ Cannot proceed without authentication")
        sys.exit(1)
    
    print()
    
    # Test API endpoints
    print("2. Testing API Endpoints...")
    api_results = test_api_endpoints(cookies)
    for endpoint, status in api_results.items():
        print(f"   {endpoint}: {status}")
    print()
    
    # Test pages
    print("3. Testing Page Routes...")
    page_results = test_pages(cookies)
    for page, status in page_results.items():
        print(f"   {page}: {status}")
    print()
    
    # Test static files
    print("4. Testing Static Files...")
    static_results = test_static_files()
    for file, status in static_results.items():
        print(f"   {file}: {status}")
    print()
    
    # Summary
    total_tests = len(api_results) + len(page_results) + len(static_results)
    passed_tests = sum(1 for result in list(api_results.values()) + list(page_results.values()) + list(static_results.values()) if "✅" in result)
    
    print(f"📊 Summary: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - check configuration")
        return 1

if __name__ == "__main__":
    sys.exit(main())