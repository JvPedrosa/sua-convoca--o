<script setup>
import { computed, onMounted, ref } from "vue";

const FORMATIONS = {
  "4-3-3": { G: 1, D: 4, M: 3, F: 3 },
  "4-4-2": { G: 1, D: 4, M: 4, F: 2 },
  "3-5-2": { G: 1, D: 3, M: 5, F: 2 },
  "4-2-3-1": { G: 1, D: 4, M: 5, F: 1 },
};

const jogadores = ref([]);
const convocados = ref([]);
const titulares = ref([]);
const busca = ref("");
const carregando = ref(false);
const erro = ref("");
const fase = ref(1);
const formacao = ref("4-3-3");
const ultimaAtualizacao = ref("");
const fonteAtual = ref("SQLite API");

const regraTitulares = computed(() => FORMATIONS[formacao.value]);

const titularesPorGrupo = computed(() => {
  return titulares.value.reduce(
    (acc, jogador) => {
      const grupo = getPositionGroup(jogador.position);
      acc[grupo] = (acc[grupo] || 0) + 1;
      return acc;
    },
    { G: 0, D: 0, M: 0, F: 0 },
  );
});

const disponiveis = computed(() => {
  const termo = busca.value.trim().toLowerCase();
  return jogadores.value.filter((jogador) => {
    const naoConvocado = !convocados.value.some(
      (item) => item.id === jogador.id,
    );

    if (!naoConvocado) {
      return false;
    }

    if (!termo) {
      return true;
    }

    return (
      jogador.name.toLowerCase().includes(termo) ||
      jogador.team.toLowerCase().includes(termo) ||
      jogador.position.toLowerCase().includes(termo)
    );
  });
});

const podeIrParaEscalacao = computed(() => convocados.value.length === 26);
const titularesCompletos = computed(() => titulares.value.length === 11);

onMounted(() => {
  carregarJogadores();
});

function getPositionGroup(position) {
  const valor = (position || "").toLowerCase();

  if (valor.includes("goalkeeper") || valor.includes("goleiro")) {
    return "G";
  }

  if (
    valor.includes("defender") ||
    valor.includes("back") ||
    valor.includes("lateral") ||
    valor.includes("zagueiro")
  ) {
    return "D";
  }

  if (
    valor.includes("midfielder") ||
    valor.includes("mid") ||
    valor.includes("meia")
  ) {
    return "M";
  }

  if (
    valor.includes("forward") ||
    valor.includes("striker") ||
    valor.includes("winger") ||
    valor.includes("atacante")
  ) {
    return "F";
  }

  return "M";
}

async function parseJsonSeguro(response) {
  const texto = await response.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto);
  } catch {
    return {};
  }
}

async function carregarJogadores(search = "") {
  carregando.value = true;
  erro.value = "";

  try {
    const query = search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : "";

    const response = await fetch(`/api/players${query}`);

    if (!response.ok) {
      throw new Error(`Falha ao buscar jogadores (${response.status})`);
    }

    const data = await parseJsonSeguro(response);
    const players = Array.isArray(data.players) ? data.players : [];

    jogadores.value = players;
    fonteAtual.value = "SQLite API";
    ultimaAtualizacao.value = data.updatedAt || new Date().toISOString();

    if (!players.length) {
      erro.value = "Nenhum jogador encontrado para esse filtro.";
    }
  } catch (err) {
    erro.value =
      err instanceof Error
        ? `${err.message}. Inicie a API com npm run api ou npm run dev:full.`
        : "Erro desconhecido ao carregar jogadores da API.";
  } finally {
    carregando.value = false;
  }
}

function atualizarDaApi() {
  carregarJogadores(busca.value);
}

function convocar(jogador) {
  if (convocados.value.length >= 26) {
    return;
  }

  convocados.value.push(jogador);
}

function removerConvocado(jogador) {
  convocados.value = convocados.value.filter((item) => item.id !== jogador.id);
  titulares.value = titulares.value.filter((item) => item.id !== jogador.id);
}

function podeSelecionarTitular(jogador) {
  if (titulares.value.some((item) => item.id === jogador.id)) {
    return true;
  }

  if (titulares.value.length >= 11) {
    return false;
  }

  const grupo = getPositionGroup(jogador.position);
  const totalNoGrupo = titularesPorGrupo.value[grupo];
  return totalNoGrupo < regraTitulares.value[grupo];
}

function alternarTitular(jogador) {
  const existe = titulares.value.some((item) => item.id === jogador.id);

  if (existe) {
    titulares.value = titulares.value.filter((item) => item.id !== jogador.id);
    return;
  }

  if (podeSelecionarTitular(jogador)) {
    titulares.value.push(jogador);
  }
}

function avancarParaEscalacao() {
  if (podeIrParaEscalacao.value) {
    fase.value = 2;
  }
}

function voltarParaConvocacao() {
  fase.value = 1;
}
</script>

<template>
  <main class="app-shell">
    <section class="hero">
      <p class="hero-kicker">Selecao Brasileira</p>
      <h1>Sua Convocacao Oficial</h1>
      <p>
        Dados de jogadores servidos por uma API propria com banco SQLite.
        Convoque 26 nomes e depois escale os 11 titulares.
      </p>

      <div class="hero-meta">
        <span
          >Jogadores carregados: <strong>{{ jogadores.length }}</strong></span
        >
        <span
          >Fonte atual: <strong>{{ fonteAtual }}</strong></span
        >
        <span
          >Ultima atualizacao: <strong>{{ ultimaAtualizacao }}</strong></span
        >
      </div>

      <div class="hero-actions">
        <button class="ghost" @click="atualizarDaApi" :disabled="carregando">
          {{ carregando ? "Atualizando..." : "Atualizar jogadores da API" }}
        </button>

        <button
          v-if="fase === 1"
          class="primary"
          @click="avancarParaEscalacao"
          :disabled="!podeIrParaEscalacao"
        >
          Escalar titulares
        </button>

        <button v-else class="ghost" @click="voltarParaConvocacao">
          Voltar para convocacao
        </button>
      </div>
    </section>

    <p v-if="erro" class="erro">{{ erro }}</p>

    <section v-if="fase === 1" class="grid grid-2">
      <article class="panel">
        <header>
          <h2>Lista de jogadores</h2>
          <input
            v-model="busca"
            type="search"
            placeholder="Filtrar por nome, clube ou posicao"
            @keyup.enter="atualizarDaApi"
          />
        </header>
        <ul class="player-list">
          <li
            v-for="jogador in disponiveis"
            :key="jogador.id"
            class="player-item"
          >
            <div class="player-info">
              <strong>{{ jogador.name }}</strong>
              <small>{{ jogador.team }} - {{ jogador.position }}</small>
            </div>
            <button
              class="primary"
              @click="convocar(jogador)"
              :disabled="convocados.length >= 26"
            >
              Convocar
            </button>
          </li>
        </ul>
      </article>

      <article class="panel">
        <header>
          <h2>Convocados ({{ convocados.length }}/26)</h2>
          <p>Feche 26 nomes para liberar a escalacao titular.</p>
        </header>
        <ul class="player-list">
          <li
            v-for="jogador in convocados"
            :key="jogador.id"
            class="player-item"
          >
            <div class="player-info">
              <strong>{{ jogador.name }}</strong>
              <small>{{ jogador.team }} - {{ jogador.position }}</small>
            </div>
            <button class="danger" @click="removerConvocado(jogador)">
              Remover
            </button>
          </li>
        </ul>
      </article>
    </section>

    <section v-else class="grid grid-2">
      <article class="panel">
        <header>
          <h2>Defina a formacao</h2>
          <select v-model="formacao">
            <option v-for="(value, key) in FORMATIONS" :key="key" :value="key">
              {{ key }}
            </option>
          </select>
          <p>
            Regra: {{ regraTitulares.G }} GOL, {{ regraTitulares.D }} DEF,
            {{ regraTitulares.M }} MEI, {{ regraTitulares.F }} ATA
          </p>
        </header>
        <ul class="player-list">
          <li
            v-for="jogador in convocados"
            :key="jogador.id"
            class="player-item"
          >
            <div class="player-info">
              <strong>{{ jogador.name }}</strong>
              <small>{{ jogador.team }} - {{ jogador.position }}</small>
            </div>
            <button
              class="primary"
              @click="alternarTitular(jogador)"
              :disabled="!podeSelecionarTitular(jogador)"
            >
              {{
                titulares.some((item) => item.id === jogador.id)
                  ? "Titular"
                  : "Escalar"
              }}
            </button>
          </li>
        </ul>
      </article>

      <article class="panel">
        <header>
          <h2>Seu time titular ({{ titulares.length }}/11)</h2>
          <p>
            GOL {{ titularesPorGrupo.G }}/{{ regraTitulares.G }} - DEF
            {{ titularesPorGrupo.D }}/{{ regraTitulares.D }} - MEI
            {{ titularesPorGrupo.M }}/{{ regraTitulares.M }} - ATA
            {{ titularesPorGrupo.F }}/{{ regraTitulares.F }}
          </p>
          <p class="status" :class="{ ok: titularesCompletos }">
            {{
              titularesCompletos
                ? "Escalacao completa."
                : "Selecione exatamente 11 titulares."
            }}
          </p>
        </header>
        <ul class="player-list">
          <li
            v-for="jogador in titulares"
            :key="jogador.id"
            class="player-item"
          >
            <div class="player-info">
              <strong>{{ jogador.name }}</strong>
              <small>{{ jogador.team }} - {{ jogador.position }}</small>
            </div>
            <button class="danger" @click="alternarTitular(jogador)">
              Tirar do time
            </button>
          </li>
        </ul>
      </article>
    </section>
  </main>
</template>
