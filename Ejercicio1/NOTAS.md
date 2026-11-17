# Cosas de Foundry

## Obtener la ABI de un contrato en particular

Si necesitas tener a mano la ABI de un contrato en particular por lo que sea, ejecuta el siguiente comando:

```bash
foundry build && cp out/<nombreArchivo.sol>/<nombreArchivo.json> <nombredestino>
```

E.j

```bash
foundry build && cp out/Counter.sol/Counter.json Counter.json
```
