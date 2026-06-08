# SAG Pallet Inspector PWA

Progressive Web App para inspección de pallets en Zebra RD40T PDA con soporte para escaneo por código de barras.

## 🚀 Características

- **Escaneo Laser**: Compatible con modo wedge (HID keyboard)
- **Inspección Multi-folio**: Carga Excel → Escanea folios → Genera reporte consolidado
- **Anomalía Detection**: Detecta diferencias en cantidad, especie, variedad, fecha, sector
- **Reporte Excel**: Genera reportes con colores y formato para análisis
- **PWA Ready**: Funciona offline, instalable como app nativa
- **Responsive Design**: Optimizado para pantallas pequeñas (5" PDA)

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Git

## 🏃 Ejecución Local

```bash
# Instalar dependencias
cd app
npm install

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de producción
npm run preview
```

La app estará en: `http://localhost:5174`

## 🚀 Despliegue en Vercel

### Opción 1: Desde GitHub (Recomendado)

1. Ir a [Vercel Dashboard](https://vercel.com)
2. Click en "New Project"
3. Seleccionar GitHub y el repositorio `proyecto_pda`
4. Vercel detectará automáticamente la configuración
5. Click en "Deploy"

### Opción 2: CLI de Vercel

```bash
npm install -g vercel
vercel
```

## 📦 Estructura del Proyecto

```
proyecto_pda/
├── app/                    # Aplicación React + Vite
│   ├── src/
│   │   ├── pages/         # Páginas principales
│   │   ├── components/    # Componentes React
│   │   ├── store/         # Zustand store
│   │   ├── utils/         # Parsers y utilidades
│   │   └── main.jsx       # Entry point
│   ├── public/            # Assets estáticos
│   ├── vite.config.js     # Config Vite
│   ├── tailwind.config.js # Config Tailwind CSS
│   └── package.json
├── vercel.json            # Config Vercel
└── .gitignore
```

## 🔧 Tecnologías

- **React 18**: UI library
- **Vite 8**: Build tool
- **Zustand**: State management
- **Tailwind CSS v4**: Styling
- **SheetJS**: Excel parsing & generation
- **PWA Plugin**: Service worker

## 🎯 Flujo de Uso

1. **Cargar archivo Excel** → Escanear folio físico
2. **Detalle del folio** → Ingresar cantidad de cajas
3. **Escaneo de cajas** → Lectura de códigos QR
4. **Comparativa en vivo** → Validación de datos
5. **Finalizar folio** → Se guarda en histórico
6. **Generar reporte consolidado** → Descargar Excel con todos los folios

## 🔐 Variables de Entorno

Crear `.env` en la carpeta `app/`:

```env
VITE_APP_TITLE=SAG Pallet Inspector
```

## 📱 Configuración PDA (Zebra RD40T)

- **Scanner Mode**: Wedge Mode (HID Keyboard)
- **Screen Size**: ~5"
- **Touch Targets**: Mínimo 48px para facilidad de uso
- **Offline**: La app funciona sin conexión (PWA)

## 📝 Notas de Desarrollo

- Los archivos en `recursos/` NO se incluyen en git (.gitignore)
- El archivo Excel real se copia a `public/Planilla_SAG_Real.xlsx`
- Los reportes se generan en el cliente (sin backend)

## 🐛 Troubleshooting

### Error de compilación en Vercel

Si aparece error sobre tamaño de chunks:
- Es normal para esta aplicación
- Vercel permite chunks hasta 1MB
- Se recomienda code-splitting para futuro

### PWA no funciona offline

Asegurarse que:
1. HTTPS está habilitado en Vercel ✅
2. Manifest.json es válido
3. Service worker se registró correctamente

## 📞 Contacto & Soporte

Proyecto en GitHub: https://github.com/brayanDRONE/proyecto_pda
