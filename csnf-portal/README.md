
# Generamos un README completo con instrucciones de instalación
readme_content = """# 🏛️ Portal de Gestión Documental - CSNiños y Familia

Sistema de gestión documental con flujo de trabajo, firma digital, agenda y administración de usuarios para la Corporación Social Niños y Familia.

## 📋 Requisitos previos

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Cuenta de Supabase** (gratis en [supabase.com](https://supabase.com))
- **Cuenta de Google Cloud** (para Google Drive API)
- **Cuenta de Resend** (para emails, gratis hasta 3,000/mes)

## 🚀 Instalación paso a paso

### 1. Crear proyecto Next.js

```bash
npx create-next-app@latest csnf-portal --typescript --tailwind --eslint --app --src-dir
```

### 2. Instalar dependencias

```bash
cd csnf-portal
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs googleapis bcryptjs jsonwebtoken date-fns react-hook-form @hookform/resolvers zod clsx tailwind-merge lucide-react @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip @radix-ui/react-avatar @radix-ui/react-popover react-day-picker react-dropzone resend uuid
```

```bash
npm install -D @types/bcryptjs @types/jsonwebtoken @types/uuid supabase
```

### 3. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve al SQL Editor
3. Copia y pega el contenido de `schema.sql`
4. Ejecuta el script
5. Copia las credenciales (URL y Anon Key) al archivo `.env.local`

### 4. Configurar Google Drive API

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto
3. Habilita la API de Google Drive
4. Crea credenciales OAuth 2.0
5. Descarga el JSON de credenciales
6. Copia Client ID y Client Secret al `.env.local`

### 5. Configurar variables de entorno

Copia `.env.example` a `.env.local` y completa tus valores:

```bash
cp .env.example .env.local
```

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del proyecto

```
csnf-portal/
├── src/
│   ├── app/                    # Rutas de Next.js (App Router)
│   │   ├── login/              # Página de login
│   │   ├── dashboard/          # Dashboard personalizado
│   │   ├── perfil/             # Perfil de usuario
│   │   ├── completar-perfil/   # Wizard primer login
│   │   ├── documentos/         # Gestión de documentos
│   │   ├── flujos/             # Flujos de firma
│   │   ├── agenda/             # Calendario y tareas
│   │   ├── kanban/             # Tablero Kanban
│   │   ├── usuarios/           # Administración de usuarios
│   │   ├── permisos/           # Matriz de permisos
│   │   ├── areas/              # Áreas y departamentos
│   │   ├── auditoria/          # Logs de auditoría
│   │   └── configuracion/      # Configuración del sistema
│   ├── components/             # Componentes reutilizables
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── lib/                    # Utilidades y configuración
│   │   ├── supabase.ts         # Cliente Supabase
│   │   ├── auth.ts             # Funciones de autenticación
│   │   ├── google-drive.ts     # Integración Google Drive
│   │   └── utils.ts            # Utilidades generales
│   └── types/                  # Tipos de TypeScript
│       └── index.ts
├── public/                     # Archivos estáticos
├── schema.sql                  # Esquema de base de datos
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 👥 Roles y permisos

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| **Superadmin** | 1 | Representante Legal - Control total |
| **Administrador** | 2 | Igual que superadmin excepto permisos de superadmin |
| **Alto Gobierno** | 3 | Aprobación de documentos estratégicos |
| **Jefe de Área** | 4 | Gestión de su área |
| **Empleado** | 5 | Subir y gestionar sus documentos |
| **Proveedor** | 6 | Acceso limitado a trámites |

## 📄 Tipos de documento soportados

- **Actas** - Requieren firma
- **Circulares** - Publicidad
- **Resoluciones** - Requieren firma
- **Memorandos** - Requieren firma
- **Citaciones** - Publicidad
- **Listados** - Publicidad
- **Formatos** - Publicidad
- **Informes** - Publicidad
- **Contratos** - Requieren firma
- **Documentos Previos para Firma** - Requieren firma
- **Evidencias/Imágenes** - Publicidad

## 🔐 Flujo de firma digital

1. Usuario sube documento y selecciona "Flujo de aprobación"
2. Sistema guarda en Google Drive carpeta `En_Firma/`
3. Notificación a primer firmante
4. Firmante descarga, firma y sube nueva versión
5. Sistema **elimina automáticamente** versión anterior
6. Proceso se repite para cada firmante
7. Al completar, documento se mueve a `Firmados/`

## 📅 Módulo de agenda

- **Eventos** - Actividades comunitarias
- **Reuniones** - Consejos y juntas
- **Tareas** - Actividades asignadas
- **Recordatorios** - Notificaciones automáticas

## 🎨 Paleta de colores

| Color | Hex | Uso |
|-------|-----|-----|
| Primary | `#1B6B6B` | Principal, botones, enlaces |
| Secondary | `#2A9D8F` | Gradientes, acentos |
| Accent | `#E76F51` | Alertas, pendientes, notificaciones |
| Success | `#2A9D8F` | Éxito, aprobado, completado |
| Warning | `#E9C46A` | Advertencias, pendientes |
| Danger | `#E76F51` | Errores, eliminaciones |

## 🛠️ Comandos útiles

```bash
# Desarrollo
npm run dev

# Construir para producción
npm run build

# Iniciar en producción
npm run start

# Lint
npm run lint

# Generar tipos de Supabase
npm run db:generate

# Push cambios a Supabase
npm run db:push
```

## 📞 Soporte

Para soporte técnico o consultas sobre el portal, contacta al área de sistemas de la Corporación Social Niños y Familia.

---

**© 2026 Corporación Social Niños y Familia** · Impulsado por Google AI Studio
"""

# Guardar README
with open('/mnt/agents/output/README.md', 'w', encoding='utf-8') as f:
    f.write(readme_content)

print("✅ README.md generado exitosamente")

# Listar todos los archivos generados
import os

print("\n" + "="*60)
print("📦 RESUMEN DE ARCHIVOS GENERADOS")
print("="*60)

all_files = []
for root, dirs, files in os.walk('/mnt/agents/output'):
    for file in files:
        filepath = os.path.join(root, file)
        rel_path = filepath.replace('/mnt/agents/output/', '')
        size = os.path.getsize(filepath)
        all_files.append((rel_path, size))

all_files.sort()

total_size = 0
for rel_path, size in all_files:
    total_size += size
    size_str = f"{size:,} B" if size < 1024 else f"{size/1024:.1f} KB" if size < 1024*1024 else f"{size/(1024*1024):.1f} MB"
    print(f"  📄 {rel_path:<50} {size_str:>10}")

print("-"*60)
print(f"  📊 Total archivos: {len(all_files)}")
print(f"  📊 Tamaño total: {total_size/1024:.1f} KB")
print("="*60)