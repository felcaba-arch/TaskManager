# Configuración de n8n para TaskManager

El frontend (`index.html` + `app.js`) espera 3 webhooks de n8n. Las URLs se configuran
desde el botón ⚙️ de la app (se guardan en `localStorage` del navegador).

## Esquema de tarea (columnas esperadas en Google Sheets)

```
id | title | description | status | priority | createdAt
```

- `status`: `pendiente` | `en_progreso` | `completada`
- `priority`: `baja` | `media` | `alta`

Si tu hoja tiene otros encabezados, ajustalos en los nodos "Google Sheets" de cada
workflow, o cambiá `STATUS_OPTIONS`/`PRIORITY_OPTIONS` en `app.js`.

## 1. Listador Tareas - Creador (ya existe)

Flujo actual: `Webhook (POST)` → `Message a model` (IA) → `Code in JavaScript` → `Append row in sheet`.

1. Abrí el nodo **Webhook** → copiá la **Production URL** → pegala en el campo "Crear tarea" del frontend.
2. En el mismo nodo, parámetro **Respond** → poné `When Last Node Finishes`, para que el webhook devuelva la fila recién creada.
3. El frontend manda: `POST { "text": "<descripción libre>" }`.
4. Revisá el prompt del nodo **Message a model**: tiene que devolver SOLO un JSON con `title`, `description`, `status` (default `pendiente`), `priority`.
5. En **Code in JavaScript**, generá un `id` único y completá defaults, por ejemplo:
   ```js
   return [{
     json: {
       id: Date.now().toString(),
       title: $json.title,
       description: $json.description || '',
       status: $json.status || 'pendiente',
       priority: $json.priority || 'media',
       createdAt: new Date().toISOString()
     }
   }];
   ```
6. Verificá que **Append row in sheet** mapee esas 6 columnas.

## 2. Listador Tareas - Lector (hay que cambiar el trigger)

Hoy arranca con un trigger **manual** ("When clicking 'Execute'"), que no se puede llamar desde afuera. Hay que reemplazarlo:

1. Tocá el nodo "When clicking 'Execute'" → eliminalo (o desconectalo).
2. Agregá un nodo nuevo con `+`: buscá **Webhook** → Method `GET` → Path, por ejemplo `listar-tareas`.
3. Conectá el Webhook directo a **Get row(s) in sheet**.
4. En el Webhook, **Respond** → `When Last Node Finishes`.
5. El nodo **Message a model** (IA) que estaba después queda fuera de esta rama por ahora — la respuesta principal tiene que ser el array de filas tal cual viene de Sheets, para que la lista se pueda renderizar en la app. Si más adelante querés un resumen con IA, lo armamos como un endpoint aparte (ej. `/resumen-tareas`).
6. Copiá la Production URL al campo "Listar tareas" del frontend.

## 3. Nuevo workflow: Gestionar Tareas (Update + Delete)

Workflow nuevo, un solo webhook para editar y borrar:

1. Creá un workflow, nombralo **Gestionar Tareas**.
2. Nodo **Webhook**: Method `POST`, Path `gestionar-tareas`, **Respond** → `When Last Node Finishes`.
3. Nodo **If** (o Switch) evaluando `{{$json.body.action}}` (revisá en una ejecución de prueba si el campo llega como `$json.action` o `$json.body.action`):
   - rama `update`
   - rama `delete`
4. Rama **update** → nodo **Google Sheets**, Operation `Update Row`, Matching Column `id` = `{{$json.id}}`, mapeá `title`, `description`, `status`, `priority` desde el body.
5. Rama **delete** → nodo **Google Sheets**, Operation `Delete Row` (o `Clear`, según la versión del nodo), Matching Column `id` = `{{$json.id}}`.
6. Publicá/activá el workflow.
7. Copiá la Production URL al campo "Gestionar tarea" del frontend.

### Body que manda el frontend a "Gestionar"

```json
// Actualizar
{ "action": "update", "id": "...", "title": "...", "description": "...", "status": "...", "priority": "..." }

// Borrar
{ "action": "delete", "id": "..." }
```

## Exponer n8n fuera de tu teléfono

Si publicás `index.html` en GitHub Pages, el navegador necesita llegar a tu n8n
(que corre en `localhost:5678` dentro de Ubuntu/Termux). Para eso, n8n no puede
ser solo `localhost`: hace falta exponerlo con un túnel, por ejemplo:

```bash
# Cloudflare Tunnel (sin cuenta, para pruebas)
cloudflared tunnel --url http://localhost:5678
```

Pegá la URL pública que te da el túnel como base de las 3 Production URLs en el frontend.
