# PowerShell Script to Verify Backend Security
# Run this in a PowerShell terminal: .\verify_backend.ps1

$baseUrl = "http://localhost:8080/api"
$loginUrl = "$baseUrl/login"
$usersUrl = "$baseUrl/users"
$rolesUrl = "$baseUrl/roles"

# 1. Login
echo "`n1. Logging in as admin..."
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri $loginUrl -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable mySession
    echo "Login Status: $($loginResponse.StatusCode)"
    echo "Cookies: $($mySession.Cookies.GetCookies($baseUrl))"
} catch {
    echo "Login Failed: $_"
    exit
}

# 2. Get Users (Protected GET)
echo "`n2. Listing Users..."
try {
    $usersResponse = Invoke-WebRequest -Uri $usersUrl -Method Get -WebSession $mySession
    echo "Get Users Status: $($usersResponse.StatusCode)"
    echo "Users: $($usersResponse.Content)"
} catch {
    echo "Get Users Failed: $_"
}

# 3. Create Role (Protected POST) - REMOVED (Roles are static)
echo "`n3. Creating Role... SKIPPED (Roles are static)"


# 4. Create User (Protected POST)
echo "`n4. Creating User..."
$userBody = @{
    username = "testapiuser"
    password = "password"
    role = @{ name = "STAFF" }
} | ConvertTo-Json

try {
    $userResponse = Invoke-WebRequest -Uri $usersUrl -Method Post -Body $userBody -ContentType "application/json" -WebSession $mySession
    echo "Create User Status: $($userResponse.StatusCode)"
    echo "Response: $($userResponse.Content)"
} catch {
    echo "Create User Failed: $_"
}

