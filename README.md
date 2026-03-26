# Convocacao Brasileira - Vue + API + SQLite

Aplicacao para convocar 26 jogadores e escalar 11 titulares com dados vindos de uma API propria.

## Stack

- Frontend: Vue 3 + Vite
- Backend: Express
- Banco de dados: SQLite

## Instalar dependencias

```bash
npm install
```

## Rodar frontend e backend juntos

```bash
npm run dev:full
```

## Rodar apenas API

```bash
npm run api
```

API disponivel em:

```text
http://localhost:3001/api/players
```

## Rodar apenas frontend

```bash
npm run dev
```

O Vite esta configurado com proxy de `/api` para `http://localhost:3001` em ambiente de desenvolvimento.

## Build de producao

```bash
npm run build
```
