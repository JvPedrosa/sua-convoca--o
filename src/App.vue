<script setup>
import { computed, onMounted, ref } from "vue";

const FALLBACK_BRASIL_PLAYERS = [
  { name: "Alisson", team: "Liverpool", position: "Goalkeeper" },
  { name: "Ederson", team: "Manchester City", position: "Goalkeeper" },
  { name: "Bento", team: "Al Nassr", position: "Goalkeeper" },
  { name: "Danilo", team: "Flamengo", position: "Defender" },
  { name: "Vanderson", team: "Monaco", position: "Defender" },
  { name: "Yan Couto", team: "Borussia Dortmund", position: "Defender" },
  { name: "Marquinhos", team: "Paris Saint-Germain", position: "Defender" },
  { name: "Gabriel Magalhaes", team: "Arsenal", position: "Defender" },
  { name: "Bremer", team: "Juventus", position: "Defender" },
  { name: "Murillo", team: "Nottingham Forest", position: "Defender" },
  { name: "Eder Militao", team: "Real Madrid", position: "Defender" },
  { name: "Guilherme Arana", team: "Atletico Mineiro", position: "Defender" },
  { name: "Wendell", team: "Porto", position: "Defender" },
  { name: "Carlos Augusto", team: "Inter", position: "Defender" },
  { name: "Joao Gomes", team: "Wolverhampton", position: "Midfielder" },
  { name: "Bruno Guimaraes", team: "Newcastle United", position: "Midfielder" },
  { name: "Douglas Luiz", team: "Juventus", position: "Midfielder" },
  { name: "Andre", team: "Wolverhampton", position: "Midfielder" },
  { name: "Andre Santos", team: "Strasbourg", position: "Midfielder" },
  { name: "Casemiro", team: "Manchester United", position: "Midfielder" },
  { name: "Gerson", team: "Flamengo", position: "Midfielder" },
  { name: "Lucas Paqueta", team: "West Ham United", position: "Midfielder" },
  { name: "Matheus Pereira", team: "Cruzeiro", position: "Midfielder" },
  { name: "Joelinton", team: "Newcastle United", position: "Midfielder" },
  { name: "Neymar", team: "Al Hilal", position: "Forward" },
  { name: "Vinicius Junior", team: "Real Madrid", position: "Forward" },
  { name: "Rodrygo", team: "Real Madrid", position: "Forward" },
  { name: "Raphinha", team: "Barcelona", position: "Forward" },
  { name: "Savinho", team: "Manchester City", position: "Forward" },
  { name: "Martinelli", team: "Arsenal", position: "Forward" },
  { name: "Endrick", team: "Real Madrid", position: "Forward" },
  { name: "Evanilson", team: "Bournemouth", position: "Forward" },
  { name: "Joao Pedro", team: "Brighton", position: "Forward" },
  { name: "Gabriel Jesus", team: "Arsenal", position: "Forward" },
  { name: "Pedro", team: "Flamengo", position: "Forward" },
  { name: "Richarlison", team: "Tottenham", position: "Forward" },
];

const FORMATIONS = {
  "4-3-3": { G: 1, D: 4, M: 3, F: 3 },
  "4-4-2": { G: 1, D: 4, M: 4, F: 2 },
  "3-5-2": { G: 1, D: 3, M: 5, F: 2 },
  "4-2-3-1": { G: 1, D: 4, M: 5, F: 1 },
};

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

const jogadores = ref([]);
const convocados = ref([]);
const titulares = ref([]);
const busca = ref("");
const buscaApi = ref("");
const carregando = ref(false);
const erro = ref("");
const fase = ref(1);
const formacao = ref("4-3-3");
const ultimaAtualizacao = ref("");
const fonteAtual = ref("Wikidata");

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

function gerarJogadoresFallback() {
  const stamp = new Date().toISOString().slice(0, 10);

  return FALLBACK_BRASIL_PLAYERS.map((item, index) => ({
    id: `fallback-${index + 1}`,
    name: item.name,
    team: item.team,
    position: item.position,
    thumb: "",
    updatedAt: stamp,
  }));
}

function escaparSparqlLiteral(texto) {
  return texto.replace(/\\/g, "\\\\").replace(/"/g, '\\"').toLowerCase();
}

function buildSparqlQuery(termo) {
  const filtroNome = termo
    ? `FILTER(CONTAINS(LCASE(?playerLabelRaw), "${escaparSparqlLiteral(termo)}"))`
    : "";

  return `
SELECT DISTINCT ?player ?playerLabelRaw ?positionLabel ?clubLabel WHERE {
  ?player wdt:P31 wd:Q5;
          wdt:P106 wd:Q937857;
          wdt:P27 wd:Q155;
          wdt:P569 ?birthDate;
          rdfs:label ?playerLabelRaw.

  FILTER(LANG(?playerLabelRaw) IN ("pt", "en"))
  FILTER(YEAR(?birthDate) >= 1986)
  FILTER(NOT EXISTS { ?player wdt:P570 ?dateOfDeath })
  ${filtroNome}

  OPTIONAL { ?player wdt:P413 ?position. }
  OPTIONAL { ?player wdt:P54 ?club. }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}
LIMIT 350
`;
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

function normalizarWikidata(binding, index) {
  const rawId = binding.player?.value || `sem-id-${index}`;
  const id = rawId.includes("/") ? rawId.split("/").pop() : rawId;

  return {
    id,
    name: binding.playerLabelRaw?.value || "Sem nome",
    team: binding.clubLabel?.value || "Sem clube",
    position: binding.positionLabel?.value || "Meia",
    thumb: "",
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

async function carregarJogadores(termo = "") {
  carregando.value = true;
  erro.value = "";

  try {
    const sparql = buildSparqlQuery(termo.trim());
    const endpoint = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(sparql)}`;

    const res = await fetch(endpoint, {
      headers: {
        Accept: "application/sparql-results+json",
      },
    });

    if (!res.ok) {
      throw new Error(`Falha na API Wikidata (${res.status})`);
    }

    const data = await parseJsonSeguro(res);
    const bindings = data?.results?.bindings || [];
    const vistos = new Set();

    const deduplicado = bindings.map(normalizarWikidata).filter((jogador) => {
      if (!jogador.id || vistos.has(jogador.id)) {
        return false;
      }
      vistos.add(jogador.id);
      return true;
    });

    if (!deduplicado.length) {
      jogadores.value = gerarJogadoresFallback();
      fonteAtual.value = "Fallback local";
      ultimaAtualizacao.value = new Date().toISOString().slice(0, 10);
      erro.value =
        "A consulta nao retornou jogadores no momento. Carregamos uma base alternativa para voce continuar.";
      return;
    }

    jogadores.value = deduplicado;
    fonteAtual.value = "Wikidata";
    ultimaAtualizacao.value = new Date().toISOString().slice(0, 10);
  } catch (err) {
    jogadores.value = gerarJogadoresFallback();
    fonteAtual.value = "Fallback local";
    ultimaAtualizacao.value = new Date().toISOString().slice(0, 10);
    erro.value =
      err instanceof Error
        ? `${err.message}. Base alternativa carregada.`
        : "Erro desconhecido ao carregar jogadores. Base alternativa carregada.";
  } finally {
    carregando.value = false;
  }
}

function buscarNaApi() {
  carregarJogadores(buscaApi.value);
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
        Busque jogadores brasileiros em geral na API publica Wikidata, convoque
        26 nomes e depois escale os 11 titulares.
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

      <div class="api-search-row">
        <input
          v-model="buscaApi"
          type="search"
          placeholder="Buscar na API por nome (ex: vinicius, endrick, neymar)"
          @keyup.enter="buscarNaApi"
        />
        <button class="primary" @click="buscarNaApi" :disabled="carregando">
          Buscar brasileiros
        </button>
      </div>

      <div class="hero-actions">
        <button class="ghost" @click="carregarJogadores" :disabled="carregando">
          {{ carregando ? "Atualizando..." : "Carregar lista geral" }}
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
          />
        </header>
        <ul class="player-list">
          <li
            v-for="jogador in disponiveis"
            :key="jogador.id"
            class="player-item"
          >
            <img
              v-if="jogador.thumb"
              :src="jogador.thumb"
              :alt="`Foto de ${jogador.name}`"
            />
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
            <img
              v-if="jogador.thumb"
              :src="jogador.thumb"
              :alt="`Foto de ${jogador.name}`"
            />
            <div>
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
            <img
              v-if="jogador.thumb"
              :src="jogador.thumb"
              :alt="`Foto de ${jogador.name}`"
            />
            <div>
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
            <img
              v-if="jogador.thumb"
              :src="jogador.thumb"
              :alt="`Foto de ${jogador.name}`"
            />
            <div>
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
