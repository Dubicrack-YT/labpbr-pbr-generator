# PBR Forge — Generador local de PBR normal

> **PBR Forge** es un sitio independiente de LABPBR Glossy Pack Generator. Convierte resource packs empaquetados en capas PBR normales, conserva color y resolución originales y trabaja completamente en el navegador.

## Qué produce

| Destino | Entradas permitidas | Salida | Capas creadas o preservadas |
| --- | --- | --- |
| Java Edition | `.zip` o `.jar` | Resource pack `.zip` | PNG original, normal LABPBR `_n`, propiedades `_s` |
| Bedrock · Vibrant Visuals | `.zip` o `.mcpack` | `.mcpack` | PNG original, `_normal`, `_mer`, `*.texture_set.json` |
| Bedrock · RTX | `.zip` o `.mcpack` | `.mcpack` | Solo bloques: PNG original, `_normal`, `_mer`, `*.texture_set.json` |

PBR Forge nunca acepta PNG, JPG, WebP ni texturas individuales. Un JAR se utiliza únicamente como fuente Java y se exporta siempre como un resource pack ZIP; no modifica ni reempaqueta JAR ejecutables.

## Alcance de texturas

El generador analiza exclusivamente las rutas de **bloques, ítems y entidades**. Excluye por completo GUI, interfaces, fuentes, pantallas, mapas, pinturas, sonidos y música. En Bedrock con RTX, el motor solo aplica PBR a bloques, por lo que el perfil RTX procesa únicamente bloques; Vibrant Visuals admite bloques, ítems y entidades. [1] [2]

La salida mantiene cada textura de color y su resolución original. Si ya hay una normal, `_s`, `_normal` o `_mer` con el nombre esperado dentro del archivo, se conserva. Para los mapas faltantes, PBR Forge deriva una normal moderada desde la luminancia local y genera propiedades prudentes según el nombre del asset: metal, vidrio, madera, piedra, tierra o genérico.

## Propiedades generadas

| Capa | Comportamiento |
| --- | --- |
| Normal | Se calcula desde cambios locales de luminancia mediante un gradiente; no se crea heightmap. |
| Java `_s` | Suavidad, F0 y porosidad seguros para el flujo LABPBR; la emisión queda apagada. |
| Bedrock `_mer` | RGB equivale a **metalness**, **emissive** y **roughness**. Emissive siempre es 0. [1] [3] |
| Texture set Bedrock | Declara color, normal y MER; nunca normal y heightmap al mismo tiempo. [3] |

> **No es un generador Glossy.** Este proyecto no crea reflejos de espejo forzados, emisión falsa, heightmaps, bump, parallax ni AO horneado. Su objetivo es una respuesta de superficie moderada, no alterar el albedo original.

## Uso

1. Elige **Java LabPBR** o **Bedrock PBR** antes de cargar los archivos.
2. Para Bedrock, selecciona **Vibrant Visuals** o **RTX**. Vibrant es el perfil multiplataforma recomendado; RTX requiere hardware y ray tracing compatibles. [2] [4]
3. Sube uno o varios paquetes válidos; cada entrada produce una descarga independiente.
4. Ajusta la intensidad de normal y pulsa **Generar mapas PBR**.
5. Importa el ZIP en Java o el MCPACK en Bedrock y revisa el resultado en una copia de prueba del mundo.

El límite local es de **300 MB por archivo**, **20 archivos por cola** y **20 000 texturas elegibles por archivo**. Canvas 2D, lectura ZIP y compresión ocurren localmente; el contenido del pack no se transmite a una API.

## Compatibilidad y limitaciones

Vibrant Visuals y RTX siguen las mismas reglas de texture sets, aunque Vibrant debe usar la capability `pbr` y RTX `raytraced`. [1] [2] El manifest generado usa `min_engine_version` 1.21.120. El aspecto final cambia con el renderizador, la versión, el dispositivo, los recursos activos y la iluminación. Un MCPACK no incorpora shaders ni habilita ray tracing por sí solo.

## Fuentes

[1] [Overview of Physically Based Rendering — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/pbroverview?view=minecraft-bedrock-stable)  
[2] [Vibrant Visuals Resource Packs — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/vvresourcepacks?view=minecraft-bedrock-stable)  
[3] [Texture Set JSON and Introduction to Texture Sets — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/texturesetsreference/texturesetsconcepts/texturesetsintroduction?view=minecraft-bedrock-stable)  
[4] [Getting Started with Ray Tracing — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/rtxgettingstarted?view=minecraft-bedrock-stable)

## Licencia

MIT. Consulta [LICENSE](./LICENSE).

