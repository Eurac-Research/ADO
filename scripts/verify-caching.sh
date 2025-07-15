#!/bin/bash

# Script to verify Next.js caching implementation
# Run this in the production environment after deployment

echo "=== Next.js Caching Verification Tool ==="
echo "Checking for server-side caching issues..."

# Check for missing static generation directives
echo "\n=== Checking for routes without force-static ==="
grep -r --include="*.tsx" --include="*.ts" "export" app | grep -v "force-static" | grep "page.tsx"
echo "Any routes listed above may not be statically generated. Verify if intentional."

# Check for fetch calls without caching
echo "\n=== Checking for fetch calls without caching options ==="
grep -r --include="*.tsx" --include="*.ts" "fetch(" app lib | grep -v "revalidate" | grep -v "force-cache" | grep -v "monthlyRevalidationOptions"
echo "Any fetch calls listed above may not be properly cached. Verify if intentional."

# Check for monthly cache utilization
echo "\n=== Usage of monthly revalidation option ==="
grep -r --include="*.tsx" --include="*.ts" "monthlyRevalidationOptions" app lib
echo "These files use monthly revalidation instead of static caching."

# Check for generateStaticParams in dynamic routes
echo "\n=== Checking for dynamic routes without generateStaticParams ==="
find app -type d -name "\[*\]" -exec sh -c 'for dir; do find "$dir" -name "page.tsx" | xargs grep -L "generateStaticParams" | grep -v "api"; done' _ {} \;
echo "Dynamic routes listed above may not be pre-generating all paths. Verify if intentional."

# Check for client-side components
echo "\n=== Client components that may bypass server caching ==="
grep -r --include="*.tsx" "use client" app | grep -v "client.tsx"
echo "These client components may need review for direct fetch calls that bypass server caching."

# Check build output
echo "\n=== Checking static build output ==="
find .next/server/app -type f -name "*.html" | wc -l
echo "Number of pre-rendered HTML files (should match expected number of static routes)"

echo "\n=== Verification complete ==="
echo "For comprehensive verification, also check network tab in browser for duplicate API calls"
