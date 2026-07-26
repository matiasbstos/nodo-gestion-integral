# 🌐 Nodo - Gestión Integral

¡Bienvenido al repositorio de **Nodo - Gestión Integral**! Esta es una aplicación web de alto rendimiento y diseño premium desarrollada para centralizar, optimizar y automatizar los procesos operativos y administrativos de la **Corporación Municipal de Melipilla (Cormumel)**. 

La plataforma ofrece una experiencia integrada y reactiva en tiempo real para la planificación de personal, control de horarios y flujos financieros de honorarios.

---

## 🤖 Co-creación con Inteligencia Artificial

Este proyecto ha sido desarrollado bajo un modelo de **co-creación y desarrollo asistido por Inteligencia Artificial (IA)**. 
A través de una colaboración interactiva entre el desarrollador y agentes de IA avanzada, se optimizaron:
* **Diseño de Arquitectura**: Estructuración limpia de componentes modulares y reactivos en React.
* **Seguridad y Reglas**: Configuración y lógica de validación de dominios y seguridad en Firebase Firestore.
* **Experiencia de Usuario (UX/UI)**: Creación de interfaces inmersivas, animaciones fluidas con Framer Motion y sistemas de diseño responsivos de alta fidelidad.

---

## 🛠️ Tecnologías Utilizadas

Para garantizar un rendimiento rápido, seguro y escalable, el proyecto se construyó sobre un stack tecnológico moderno y reactivo:

* **Frontend**: React 19, Vite (para compilación ultra rápida), Tailwind CSS (estilos modernos y responsivos), Framer Motion (para micro-animaciones fluidas) y Lucide React (iconografía).
* **Backend & Base de Datos**: Firebase (Firestore Database, Firebase Authentication).
* **Control de Versiones y Entorno**: Git, Node.js y npm.

---

## ✨ Características Principales

* 🕒 **Control de Asistencia**: Interfaz intuitiva para el registro diario de entrada, salida y cálculo preciso de horas trabajadas para el personal.
* 📅 **Gestión de Turnos Funcionario**: Módulos dedicados para la planificación, asignación y visualización mensual/semanal de turnos de trabajo.
* 🧾 **Administración de Honorarios**: Panel administrativo y vista para trabajadores a honorarios, facilitando el seguimiento de boletas y procesos de pago.
* 📊 **Matriz Remuneracional y Ajustes**: Configuración flexible de matrices de pago, tarifas maestro y bonificaciones operacionales.
* 🔐 **Seguridad y Control de Acceso (RBAC)**: 
  * Validación estricta por dominio institucional (`@cormumel.cl`).
  * Asignación de roles diferenciados (Funcionarios, Administradores Globales, Operacionales) con vistas y permisos protegidos en tiempo real.

---

## 🚀 Cómo Configurar tu Entorno Local

Si deseas probar el proyecto o continuar con el desarrollo de forma local, sigue estos sencillos pasos:

### 1. Clonar el repositorio
Abre tu terminal y descarga el código en tu equipo:
```bash
git clone https://github.com/matiasbstos/nodo-gestion-integral.git
cd nodo-gestion-integral
```

### 2. Instalar dependencias del proyecto
Instala todas las librerías necesarias con npm:
```bash
npm install
```

### 3. Ejecutar el Servidor Local de Desarrollo
Levanta el proyecto localmente para visualizar los cambios en vivo en tu navegador:
```bash
npm run dev
```
*(Por defecto, se ejecutará en [http://localhost:5173/](http://localhost:5173/))*

---

## 📁 Estructura del Repositorio

El proyecto mantiene una estructura limpia orientada a componentes modulares:

```text
nodo-gestion-integral/
├── public/                # Activos estáticos públicos
├── src/
│   ├── assets/            # Imágenes y recursos estáticos internos
│   ├── components/        # Componentes de React y Vistas del Sistema
│   │   ├── Login.jsx                 # Pantalla de acceso institucional
│   │   ├── Layout.jsx                # Estructura base de navegación
│   │   ├── Sidebar.jsx               # Menú de navegación lateral
│   │   ├── Attendance.jsx            # Control de asistencia funcionario
│   │   ├── FuncionarioTurnosView.jsx # Vista de turnos asignados
│   │   ├── MisHonorariosView.jsx     # Gestión de boletas personal
│   │   ├── AdminDashboardView.jsx    # Dashboard administrativo
│   │   ├── AdminOperativaView.jsx    # Administración de turnos y personal
│   │   ├── AdminHonorariosView.jsx   # Gestión global de honorarios
│   │   └── MatrizRemuneracionalView.jsx # Matriz de remuneraciones
│   │   └── ...
│   ├── utils/             # Funciones de utilidad (ej. formateadores de tiempo)
│   ├── App.jsx            # Enrutador principal y cargador de perfil
│   ├── firebase.js        # Configuración del SDK de Firebase
│   ├── index.css          # Estilos globales y tokens de diseño
│   └── main.jsx           # Punto de entrada de la aplicación
├── package.json           # Dependencias y scripts npm
├── vite.config.js         # Configuración de compilación de Vite
└── tailwind.config.js     # Configuración de Tailwind CSS
```

---

## 🧱 Muro de Actualizaciones (Changelog)

### 🚀 versión 1.3.0 — (26 de Julio de 2026)

* 📄 **Informe Oficial de Prestación de Servicios (`<InformeHonorariosPrint />`)**:
  * Réplica visual exacta (pixel-perfect) del documento oficial de honorarios de la Corporación Municipal de Melipilla en 2 páginas A4.
  * Integración del logotipo oficial corporativo (`logo_corporativo.png` almacenado en la carpeta `IMG/` y `public/img/`).
  * Alineación exacta de encabezados (`NOMBRE`, `RUT`, `CARGO`, `LUGAR`, `MES Y AÑO`) con colons (`:`) verticalmente alineados.
  * Tablas de resumen de servicio (`Lu-Vi`, `Sa-Do-Fest`), montos totales y cuadro de transferencia bancaria.
  * Distribución de bloques de firma: 3 firmas horizontales en Página 1 y 2 firmas en Página 2.
  * **Modo de Edición Dinámico**: Permite ajustar horas, valores, datos bancarios y actividades antes de exportar el PDF definitivo.

* 🖨️ **Aislamiento Estricto de Impresión A4 Multipágina (2 Hojas)**:
  * Reglas CSS `@media print` con aislamiento estricto que ocultan la UI circundante (Sidebar, Topbar, tarjetas de perfil y pestañas).
  * Flujo estático y salto de página continuo (`break-after-page`) que garantiza la exportación limpia de las **2 páginas completas** del documento.

* 🚨 **Liberación Automática de Puestos Vacantes & Reemplazos**:
  * Sincronización automática al registrar licencias médicas, vacaciones, permisos o inasistencias en el perfil del funcionario, liberando los turnos programados como **VACANTE** en la Pauta.
  * Botón destacado de **`+ Asignar Reemplazo`** para reasignar cargos vacantes a personal disponible en un clic.

### 🚀 versión 1.2.0 — (Julio 2026)

* 📅 **Unificación del Módulo "Pauta de Turnos"**:
  * Implementación de la grilla de calendario mensual de 7 columnas (Lunes a Domingo) con distinción de festivos y fines de semana en rojo.
  * Casillas de `Festivo` dinámicas por día para alternar franjas horarias (Semana Largo `17-08h`, Fin de Semana Día `08-20h` y Noche `20-08h`).
  * Planilla de dotación diaria completa para los 7 roles base (*Enfermero Jefe*, *TENS Rayos*, *TENS Vacunas*, *TENS Ambulancia*, *Conductor*, *Administrativo*, *Auxiliar*) más Médicos y Refuerzos.
  * Auto-categorización por funcionario (Ley 19.378: Cat A a Cat F) e integración de gestión de inasistencias (licencias, permisos, vacaciones) y asignación inmediata de reemplazos.
  * Tarjetas de totalización mensual al pie (`TOTAL DE TURNOS ASIGNADOS`) para Turno 1 (Verde), Turno 2 (Amarillo), Turno 3 (Celeste) y Turno 4 / Refuerzo (Púrpura).

* 🏷️ **Asignación Directa de Turnos & Selección de Liquidación**:
  * Modal de asignación directa con distinción de color por tipo de turno.
  * Selector interactivo para cambiar la modalidad de liquidación asociada (*Horas Extras* vs. *Honorarios*).

* 📆 **Grilla de Calendario por Funcionario**:
  * Integración de la vista de calendario mensual y tarjetas totalizadoras dentro del expediente del funcionario en la pestaña `Turnos Asignados`.
  * Barra de pestañas adaptable en multilínea (`flex-wrap`).

