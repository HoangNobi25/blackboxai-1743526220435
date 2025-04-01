@echo off
cls
echo Starting Salary App servers...
echo -----------------------------

:: Check if port 8000 is in use
netstat -ano | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo Port 8000 is already in use. Please free up the port and try again.
    exit /b 1
)

:: Create data directory if it doesn't exist
if not exist "backend\data" mkdir "backend\data"

:: Start backend server
echo Starting backend server...
cd backend

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo Installing backend dependencies...
    call npm install
)

:: Start the backend server
start "Backend Server" cmd /c npm run dev

:: Wait a bit for backend to start
timeout /t 5 /nobreak >nul

:: Start frontend server
echo Starting frontend server...
cd ..\frontend

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
)

:: Start the frontend server
start "Frontend Server" cmd /c npm run dev

echo -----------------------------
echo Both servers are now running!
echo Access the application at: http://localhost:8000
echo.
echo Default manager credentials:
echo Email: admin@example.com
echo Password: admin123
echo.
echo Close this window to stop both servers

:: Keep the window open
pause >nul