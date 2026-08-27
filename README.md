# PBR Forge — Generador local de PBR normal

> **PBR Forge** es un sitio independiente de LABPBR Glossy Pack Generator. Convierte resource packs empaquetados en capas PBR normales, conserva color y resolución originales y trabaja completamente en el navegador.

## Qué produce

| Destino | Entradas permitidas | Salida | Capas creadas o preservadas |
| --- | --- | --- |
| Java Edition | `.zip` o `.jar` | Resource pack `.zip` | PNG original, normal LABPBR `_n` con profundidad en alfa, `_s` y `texture.properties` LabPBR 1.3 |
| Bedrock · Vibrant Visuals | Release oficial `full.zip`, `.zip` o `.mcpack` | `.mcpack` | Elige Normal + MER o Profundidad (heightmap) + MER; normal admite bloques, ítems y entidades, heightmap solo bloques |
| Bedrock · RTX | Release oficial `full.zip`, `.zip` o `.mcpack` | `.mcpack` | Solo bloques: Normal + MER o Profundidad (heightmap) + MER, con `*.texture_set.json` válido |

PBR Forge nunca acepta PNG, JPG, WebP ni texturas individuales. Un JAR se utiliza únicamente como fuente Java y se exporta siempre como un resource pack ZIP; no modifica ni reempaqueta JAR ejecutables.

## Alcance de texturas

El generador analiza exclusivamente las rutas de **bloques, ítems y entidades**. Excluye por completo GUI, interfaces, fuentes, pantallas, mapas, pinturas, sonidos y música. En Bedrock con RTX, el motor solo aplica PBR a bloques, por lo que el perfil RTX procesa únicamente bloques; Vibrant Visuals admite bloques, ítems y entidades. [1] [2]

La salida mantiene cada textura de color y su resolución original. Si ya hay una normal, `_s`, `_normal`, `_mer` o `_heightmap` con el nombre esperado dentro del archivo, se conserva. Para los mapas faltantes, PBR Forge deriva una normal moderada y una profundidad lineal desde la luminancia y los bordes locales, además de generar propiedades prudentes según el nombre del asset: metal, vidrio, madera, piedra, tierra o genérico.

## Propiedades generadas

| Capa | Comportamiento |
| --- | --- |
| Normal | Se calcula desde cambios locales de luminancia mediante un gradiente. En Java, RGB codifica la normal y el alfa almacena profundidad/displacement lineal. [6] [7] |
| Profundidad Java | La escala **0–100** controla el relieve codificado en el alfa de `*_n.png`; 0 deja la capa plana. El resultado necesita un shader que interprete el canal alfa. [6] |
| Heightmap Bedrock | El modo **Profundidad + MER** crea `*_heightmap.png` monocanal. Un Texture Set Bedrock no puede declarar normal y heightmap juntos; el modo se limita a bloques. [1] [3] |
| Java `_s` | Suavidad, F0 y porosidad seguros para el flujo LABPBR; la emisión queda apagada. |
| Bedrock `_mer` | RGB equivale a **metalness**, **emissive** y **roughness**. Emissive siempre es 0. [1] [3] |
| Texture set Bedrock | Declara color, MER y exactamente una capa de detalle: normal o heightmap. [3] |

> **No es un generador Glossy.** Este proyecto no crea reflejos de espejo forzados, emisión falsa, AO horneado ni geometría de malla. Genera profundidad de textura para que un shader o un renderer compatible pueda interpretarla, sin alterar el albedo original.

## Uso

1. Elige **Java LabPBR** o **Bedrock PBR** antes de cargar los archivos.
2. Para Bedrock, selecciona **Vibrant Visuals** o **RTX**. Vibrant es el perfil multiplataforma recomendado; RTX requiere hardware y ray tracing compatibles. [2] [4]
3. En **Assets Bedrock**, deja seleccionado **Oficiales** para consultar las releases de [`Mojang/bedrock-samples`][5]. El sitio muestra primero las versiones estables y solo ofrece assets `full.zip`, porque `min.zip` no contiene texturas ni binarios.
4. Usa **Usar full.zip** para intentar poner la release en la cola local, o **Descargar** para obtenerla directamente de Mojang. Si GitHub bloquea la lectura cross-origin desde el sitio estático, descarga el archivo oficial y cambia a **Custom** para subir ese mismo `.zip`; Custom solo admite ZIP/MCPACK, sin JAR, APK ni imágenes individuales.
5. Ajusta **Intensidad de normal** y **Profundidad derivada**. En Bedrock, selecciona **Normal + MER** para el alcance amplio o **Profundidad + MER** para un heightmap de bloques.
6. Pulsa **Generar PBR + profundidad**. Cada entrada genera una descarga independiente.
7. Importa el ZIP en Java o el MCPACK en Bedrock y revisa el resultado en una copia de prueba del mundo.

El límite local es de **300 MB por archivo**, **20 archivos por cola** y **20 000 texturas elegibles por archivo**. Canvas 2D, lectura ZIP y compresión ocurren localmente; el contenido del pack no se transmite a una API.

## Compatibilidad y limitaciones

Vibrant Visuals y RTX siguen las mismas reglas de texture sets, aunque Vibrant debe usar la capability `pbr` y RTX `raytraced`. [1] [2] El manifest generado usa `min_engine_version` 1.21.120. Un Texture Set Bedrock es inválido si incluye normal y heightmap simultáneamente; además, Vibrant no permite aplicar heightmaps a objetos basados en texturas, como ítems. [3] El aspecto final cambia con el renderizador, la versión, el dispositivo, los recursos activos y la iluminación. Un MCPACK no incorpora shaders ni habilita ray tracing por sí solo.

## Fuentes

[1] [Overview of Physically Based Rendering — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/pbroverview?view=minecraft-bedrock-stable)  
[2] [Vibrant Visuals Resource Packs — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/vvresourcepacks?view=minecraft-bedrock-stable)  
[3] [Texture Set JSON and Introduction to Texture Sets — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/texturesetsreference/texturesetsconcepts/texturesetsintroduction?view=minecraft-bedrock-stable)  
[4] [Getting Started with Ray Tracing — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/rtxgettingstarted?view=minecraft-bedrock-stable)  
[5] [Mojang bedrock-samples releases](https://github.com/Mojang/bedrock-samples/releases)

[6] [LabPBR Material Standard — shaderLABS](https://shaderlabs.org/wiki/LabPBR_Material_Standard)

[7] [PBR Standards — Iris Docs](https://shaders.properties/current/how-to/pbr_standards/)

## Licencia

MIT. Consulta [LICENSE](./LICENSE).
