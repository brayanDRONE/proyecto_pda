@echo off
cd /d C:\proyecto_pda\app
node -e "import('./src/utils/generateTestExcel.js')"
echo.
echo ✓ Archivo de prueba creado en: public/Planilla_Prueba_SAG.xlsx
pause
