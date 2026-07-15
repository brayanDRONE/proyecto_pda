# ──────────────────────────────────────────────
# Backend SAG PDA — Instrucciones de despliegue
# ──────────────────────────────────────────────

## Configuración local (desarrollo)

### 1. Crear y activar entorno virtual
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno
Copiar `.env.example` a `.env` y completar:
```
SECRET_KEY=<clave-secreta-larga>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
MONGODB_URI=mongodb://localhost:27017/pda_db
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### 4. Aplicar migraciones (SQLite para admin/sessions)
```bash
python manage.py migrate
python manage.py createsuperuser  # opcional, para acceder a /admin/
```

### 5. Correr servidor de desarrollo
```bash
python manage.py runserver 8000
```

La API estará disponible en `http://localhost:8000/api/`

---

## Despliegue en Railway / Render (producción)

### MongoDB Atlas
1. Crear cuenta en https://cloud.mongodb.com
2. Crear cluster M0 (gratuito)
3. Crear usuario de base de datos
4. Whitelist IP: `0.0.0.0/0` (permite conexiones desde cualquier IP)
5. Copiar connection string: `mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/pda_db`

### Railway
1. Conectar repositorio GitHub
2. Seleccionar directorio `backend/`
3. Agregar variables de entorno:
   - `SECRET_KEY` = clave larga y aleatoria
   - `DEBUG` = False
   - `ALLOWED_HOSTS` = tu-app.railway.app
   - `MONGODB_URI` = connection string de Atlas
   - `CORS_ALLOWED_ORIGINS` = https://tu-frontend.vercel.app
4. El `Procfile` ya está configurado para gunicorn

### Vercel (frontend)
1. Agregar variable de entorno en Vercel:
   - `VITE_API_URL` = https://tu-backend.railway.app
2. Redeploy

---

## Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/health/ | Health check |
| GET | /api/lotes/ | Lista todos los lotes |
| POST | /api/lotes/ | Crear lote (multipart: archivo + datos) |
| GET | /api/lotes/{folio_id}/ | Detalle completo |
| PATCH | /api/lotes/{folio_id}/estado/ | Actualizar estado |
| POST | /api/lotes/{folio_id}/revision/ | Guardar revisión |
| GET | /api/lotes/{folio_id}/archivo/ | Descargar Excel original |
| DELETE | /api/lotes/{folio_id}/ | Eliminar lote |
