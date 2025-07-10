#!/bin/bash

echo "Testing PgPool Admin Dashboard UI Functions..."
echo "=============================================="

# Test if all JavaScript files are accessible
JS_FILES=(
    "dashboard.js"
    "nodes.js"
    "performance-monitor.js"
    "queries.js"
    "databases.js"
    "console.js"
    "history.js"
    "cluster-status.js"
)

echo -e "\n📁 Checking JavaScript files accessibility:"
for file in "${JS_FILES[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/static/js/$file)
    if [ "$response" == "200" ]; then
        echo "✅ $file - OK (HTTP $response)"
    else
        echo "❌ $file - FAILED (HTTP $response)"
    fi
done

echo -e "\n📄 Checking main pages:"
PAGES=(
    ""
    "nodes"
    "performance-monitor"
    "queries"
    "databases"
    "console"
    "history"
    "cluster-status"
)

for page in "${PAGES[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/$page)
    if [ "$response" == "200" ]; then
        echo "✅ /$page - OK (HTTP $response)"
    else
        echo "❌ /$page - FAILED (HTTP $response)"
    fi
done

echo -e "\n✨ UI Test Complete!"