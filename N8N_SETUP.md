# Configuración de n8n para TaskManager

Todo el backend vive en **un solo workflow** (`n8n-workflow.json`), con 3 webhooks
independientes en el mismo canvas: Crear, Listar y Gestionar (editar/borrar).

## Esquema real de la hoja "TAREAS"

```
col_1 (sin usar) | col_2 = TAREA | col_3 = ESTADO | col_4 = PRIORIDAD | col_5 = CATEGORIA | col_6 = FECHA_LIMITE | col_7 = NOTAS
```

No hay columna de ID: cada tarea se identifica por su **número de fila** (`row_number`),
que Google Sheets devuelve automáticamente. Por eso no hace falta tocar la hoja.

`ESTADO` esperado: `Pendiente` | `En progreso` | `Completada` (y `Eliminada` para las borradas).
`PRIORIDAD` esperada: `Baja` | `Media` | `Alta`.

**Borrar es un borrado lógico**: en vez de eliminar la fila, se marca `ESTADO = Eliminada`
y la lista la oculta. Es más seguro (no se pierde nada) y evita errores de desincronización
de filas en Sheets.

## Cómo importar el workflow

1. Abrí n8n → entrá al workflow **"Listador Tareas - Creador"** actual → desactivalo
   (toggle "Active"/"Published" a apagado). Esto libera la URL de webhook que ya usa.
2. Volvé a la lista de workflows → creá uno **nuevo, vacío**.
3. Dentro del workflow vacío, tocá el menú **"..."** (arriba a la derecha) → **"Import from File"**
   → seleccioná `n8n-workflow.json`.
4. Activá/Publicá el workflow importado.
5. (Opcional) Borrá los workflows viejos "Listador Tareas - Creador" y "Listador Tareas - Lector",
   ya quedaron reemplazados por este.

La rama "Crear" reutiliza la misma dirección de webhook que ya tenías guardada
(`http://localhost:5678/webhook/ebfea8a0-4105-41fe-ab17-9668abf4935d`), así que no
hace falta cambiarla en el frontend.

## Las 3 URLs para configurar en la web (⚙️ Configuración)

1. **Crear tarea**: la que ya tenías.
2. **Listar tareas**: abrí el nodo **"Webhook - Listar"** → pestaña "Production URL" → copiá.
3. **Gestionar tarea**: abrí el nodo **"Webhook - Gestionar"** → pestaña "Production URL" → copiá.

## Contrato de cada endpoint

**Crear** — `POST` con:
```json
{ "tarea": "descripción libre, ej: comprar materiales para el viernes prioridad alta" }
```

**Listar** — `GET`, responde:
```json
[
  { "id": 2, "tarea": "...", "estado": "Pendiente", "prioridad": "Alta", "categoria": "...", "fecha_limite": "2026-06-25", "notas": "..." }
]
```
(`id` es el número de fila en la hoja)

**Gestionar** — `POST` con:
```json
// Actualizar
{ "action": "update", "id": 2, "tarea": "...", "estado": "...", "prioridad": "...", "categoria": "...", "fecha_limite": "...", "notas": "..." }

// Borrar (lógico)
{ "action": "delete", "id": 2 }
```

## Exponer n8n fuera de tu teléfono

Si publicás `index.html` en GitHub Pages, el navegador necesita llegar a tu n8n
(que corre en `localhost:5678` dentro de Ubuntu/Termux). Para eso hace falta un túnel:

```bash
# Cloudflare Tunnel (sin cuenta, para pruebas)
cloudflared tunnel --url http://localhost:5678
```

Pegá la URL pública que te da el túnel como base de las 3 Production URLs en el frontend.
