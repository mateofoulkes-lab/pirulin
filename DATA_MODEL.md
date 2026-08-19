# Pirulín — Firestore data model

Base inicial para reemplazar progresivamente los mocks de `mockup_pirulin_v51.html` sin reescribir su interfaz.

## Usuarios

Autenticación Google. Solo estas dos cuentas pueden utilizar la app:

- `mateofoulkes@gmail.com` → Mateo
- `danifernandez.sn@gmail.com` → Dani

El UID de Firebase Authentication es la identidad real. Los emails solo forman la allowlist de entrada.

## Datos privados

Todo lo que vive debajo de `users/{uid}` solo puede ser leído/escrito por ese UID.

- `users/{uid}/tasks/{taskId}` — tareas privadas
- `users/{uid}/taskCategories/{categoryId}` — categorías privadas de Tareas
- `users/{uid}/notes/{noteId}` — notas privadas
- `users/{uid}/noteCategories/{categoryId}` — árbol privado de categorías de Notas
- `users/{uid}/healthLog/{entryId}` — Registro privado de Comidas/Salud
- `users/{uid}/settings/main` — preferencias personales

## Datos compartidos

Se agrupan debajo del documento contenedor `shared/data`:

- `shared/data/tasks/{taskId}` — tareas compartidas
- `shared/data/expenses/{expenseId}` — gastos y settlements
- `shared/data/mealPlan/{mealId}` — Plan de comidas
- `shared/data/notes/{noteId}` — proyección compartida de una nota

`shared/data/notes` no contiene las categorías privadas del autor. El receptor la ve bajo la categoría virtual `Notas compartidas` y puede asociarle categorías propias localmente.

## Task

```js
{
  id,
  title,
  categoryId: null,
  date: null,            // YYYY-MM-DD
  time: null,            // HH:mm
  repeat: {
    type: "none" | "weekly" | "monthly" | "yearly",
    days: []
  },
  persistent: false,
  shared: false,
  createdByUid,
  createdByName,
  completed: false,
  notes: null,
  link: null,
  parentId: null,
  order: 0,
  updatedAt,
  createdAt
}
```

Las subtareas son también Task. `parentId` permite profundidad arbitraria.

Conflictos: último cambio gana en campos simples. Para árboles/listas se preservan documentos por ID para no pisar hermanos no relacionados.

## Expense

Compatible conceptualmente con Pingüé Split. Expense y settlement viven en la misma colección compartida. Los settlements usan `settlement: true`.

No ejecutar ninguna migración automática desde `pingue-split`.

## Meal plan

```js
{ id, date, time, text, createdByUid, createdByName, updatedAt, createdAt }
```

Compartido entre ambos usuarios.

## Health log

Privado bajo el UID. Nunca se comparte ni genera notificaciones.

Tipos:

- `food`: date, time, text, calories opcional
- `activity`: date, time, text, durationMinutes
- `weight`: date, time, weightKg, bodyFatPercent opcional, musclePercent opcional

## Seguridad

`firestore.rules` es la frontera de seguridad. La UI no se considera una barrera de privacidad.

No desplegar reglas ni ejecutar migraciones sin confirmación explícita.
