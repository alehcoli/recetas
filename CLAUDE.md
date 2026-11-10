# Contexto para Claude Code

Este repo es el dashboard familiar de recetario/menú descrito en `README.md`.
Además de esas instrucciones técnicas, ten en cuenta lo siguiente al ayudar
a planificar el menú.

## Pauta nutricional de referencia (Gabriela)

Gabriela (amiga de la familia) sigue una pauta antiinflamatoria pautada por
una nutricionista (María Real Capell). No es la dieta por defecto de la
familia ni de los niños — el menú escolar y el menú familiar normal siguen
como siempre — pero **cuando se pida ayuda para planificar comidas o cenas
siguiendo esta pauta** (para Gabriela, o como inspiración de "comida sana"
para los adultos), aplica estas reglas:

### Regla del plato
- ½ del plato: verduras (crudas, cocidas, salteadas, asadas o en crema;
  mínimo 3 colores a la semana).
- ¼ del plato: proteína (pollo, pavo, pescado, huevo o legumbres).
- ¼ del plato: hidrato de carbono de calidad, siempre sin gluten.
- Añadir siempre especias y aliñar con aceite de oliva virgen extra (AOVE).

### A priorizar
- **Hidratos sin gluten**: trigo sarraceno, quinoa, arroz integral, avena
  sin gluten, patata y boniato (variedad AR3), legumbres bien cocidas.
- **Verduras**: crucíferas (brócoli, coliflor, col lombarda, kale),
  hoja verde (espinacas, rúcula, canónigos), de temporada, variadas en
  forma de preparación.
- **Fruta**: entera y de temporada, nunca en zumo. Máximo 2 piezas al día.
  Preferir frutas del bosque, manzana, pera, kiwi, cítricos.
- **Proteínas**: huevos, pescado azul pequeño (sardina, caballa, boquerón),
  pescado blanco (merluza, bacalao, rape, lubina), pollo/pavo de calidad,
  ternera magra de pasto, legumbres, marisco (mejillones, berberechos,
  gambas).
- **Grasas**: AOVE (principal), aguacate, frutos secos naturales/tostados,
  semillas (chía, lino, calabaza, sésamo).
- **Lácteos**: solo de cabra u oveja (yogur, kéfir, quesos frescos o
  curados) — nunca de vaca, salvo variedad A2.
- **Especias/condimentos**: cúrcuma, comino, jengibre, canela, ajo,
  cebolla, perejil, tomillo, romero, orégano, limón, vinagre de manzana.

### A evitar
- Azúcar y edulcorantes en cualquier forma (azúcar, jarabes, mieles,
  maltodextrinas, "terminados en -osa"…).
- Gluten e hidratos de carbono refinados.
- Cacahuetes, soja y derivados.
- Exceso de sal; ultraprocesados; comida precocinada.
- Aceites vegetales refinados (girasol, palma, colza), margarina, grasa
  de cerdo.
- Lácteos de vaca (salvo A2); alcohol; bebidas con cafeína con gas.
- Aditivos: glutamatos (E-620 a E-625 / GMS), hidroxibenzoatos (E-214 a
  E-219), edulcorantes artificiales.
- Pescados con mucho mercurio: pez espada, panga, atún rojo, tiburón,
  lucio.

### Desayuno — dos formatos habituales
- **Tostada** de pan de trigo sarraceno + 1 grasa saludable (AOVE,
  aguacate, semillas, crema de frutos secos, tahini) + 2 proteínas (pavo,
  jamón de calidad, queso fresco de cabra, huevo) + fruta/frutos rojos.
- **Yogur o porridge**: base de yogur/kéfir de cabra o avena sin
  gluten/trigo sarraceno + semillas + grasa saludable + fruta.
- No hace falta variar cada día; se puede repetir el mismo desayuno.

### Snacks (si hay hambre real entre horas)
Zanahoria/pepino con hummus, aceitunas/encurtidos, huevo duro, frutos
secos con fruta, marisco al natural con limón, chocolate negro >85%,
queso fresco de cabra con nueces, yogur de cabra.

### Cómo adaptar/crear un plato sobre la marcha
1. Una proteína (carne magra, pescado, marisco, huevo o legumbre).
2. Verduras abundantes (hoja verde + color, crudas o cocinadas).
3. Un hidrato de calidad sin gluten.
4. Grasa saludable + aliño (AOVE + especias: cúrcuma+limón,
   cúrcuma+jengibre, cúrcuma+comino, romero, mostaza, tahini, yogur…).

### En la app
"Generar menú aleatorio" (`generateRandomMonth` en `index.html`) aplica ya
la regla de ternera como mucho una vez cada 10 días
(`TERNERA_MIN_GAP_DAYS`). El resto de reglas de la pauta no están en el
código.

### Recetario
Las recetas completas de esta pauta (lentejas estofadas, garbanzos con
espinacas y bacalao, acelgas rehogadas, pisto, coliflor al horno,
albóndigas de ternera, ensaladilla rusa de garbanzo, guiso de alubias,
cardo con ternera) están pensadas para añadirse al Recetario de la app
como recetas normales, con público "Adultos" y sus ingredientes reales
(para que la lista de la compra las reconozca bien — ver nota de
usabilidad más abajo).

## Notas de la auditoría de usabilidad (pendientes de decidir)

- La lista de la compra enlaza receta↔ingredientes por **coincidencia
  exacta de nombre** (`findRecipeByName`, case-insensitive pero sin
  tolerancia a variaciones de texto). Si el nombre del día no coincide
  letra a letra con el de la receta, el plato entero se cuela en la
  lista como ítem "(plato manual del menú)" en vez de tirar de sus
  ingredientes — sin aviso. Tenerlo en cuenta al escribir el menú a mano
  o al decidir si merece la pena mejorar el matching.
- En "Menú niños (cole)" los días de desbordamiento de semana fuera del
  mes natural se muestran como huecos completamente en blanco
  (`day-card.out`), a diferencia de "Menú mensual" que sí los muestra
  con fecha y "+ Añadir". Es intencional en el código pero visualmente
  inconsistente.
- No hay chip de filtro por "Público" (niños/adultos) en el Recetario,
  aunque el dato existe y se muestra como etiqueta.
- La barra de pestañas no tiene scroll horizontal en móvil
  (`flex-wrap`), así que con las 6 pestañas actuales se parte en 3 filas
  en pantallas estrechas.
