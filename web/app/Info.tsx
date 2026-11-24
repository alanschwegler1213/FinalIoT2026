import {
  Activity,
  ArrowRight,
  BookOpen,
  Cpu,
  Database,
  Droplet,
  PawPrint,
  Scissors,
  Server,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";

const CUIDADOS = [
  { icono: Sun, tono: "#e7c35a", titulo: "Luz", texto: "6 a 8 horas de sol directo. Adentro, la ventana más luminosa de la casa." },
  { icono: Droplet, tono: "#4a8fe0", titulo: "Riego", texto: "Tierra apenas húmeda, nunca encharcada. Regá en la base, de mañana, cuando los primeros 2 cm estén secos." },
  { icono: Thermometer, tono: "#e0663f", titulo: "Temperatura", texto: "Ideal entre 18 y 30 °C. Debajo de 10 °C sufre y una helada la mata." },
  { icono: Wind, tono: "#8fd4c1", titulo: "Aire", texto: "Que circule aire. Las hojas mojadas de noche favorecen los hongos." },
  { icono: Sprout, tono: "#7ee2a4", titulo: "Abono", texto: "Fertilizante líquido suave cada 3 o 4 semanas en primavera y verano. De más, pierde aroma." },
  { icono: Scissors, tono: "#c9a7f0", titulo: "Cosecha", texto: "Cortá justo arriba de un par de hojas y nunca más de un tercio de la planta." },
];

const SINTOMAS = [
  { senal: "Hojas caídas y blandas", causa: "Le falta agua. Si la regás se recupera en pocas horas." },
  { senal: "Hojas amarillas abajo, tierra mojada", causa: "Exceso de riego: las raíces se quedan sin aire." },
  { senal: "Manchas negras", causa: "Frío o hongos. Alejala de corrientes y no mojes las hojas." },
  { senal: "Tallos largos con pocas hojas", causa: "Falta de luz. Movela a un lugar más soleado." },
  { senal: "Aparecen flores", causa: "Pellizcalas: si florece, deja de dar hojas y se pone amarga." },
];

const CURIOSIDADES = [
  "Su nombre viene del griego basilikón, “real”: era la hierba digna de reyes.",
  "Hay más de 60 variedades: genovesa, morada, limón, canela, tailandesa…",
  "Es pariente de la menta, el orégano, el romero y la lavanda.",
  "El aroma sale de aceites esenciales como el linalol y el eugenol, el mismo del clavo de olor.",
];

export function LaPlanta() {
  return (
    <section id="planta" className="tarjeta revelar" aria-labelledby="t-planta">
      <header className="ficha-encabezado">
        <span className="ceja">La planta</span>
        <h2 id="t-planta" className="ficha-nombre">
          Albahaca
        </h2>
        <p className="cientifico">
          <i>Ocimum basilicum</i> · familia de las lamiáceas
        </p>
      </header>

      <dl className="hechos">
        <div>
          <dt>Origen</dt>
          <dd>India y el sudeste asiático tropical</dd>
        </div>
        <div>
          <dt>Ciclo</dt>
          <dd>Anual: vive una temporada cálida</dd>
        </div>
        <div>
          <dt>Humedad ideal de la tierra</dt>
          <dd>Entre 45 y 85 % en este sensor</dd>
        </div>
      </dl>

      <p className="cita">
        Es de las aromáticas que <b>más rápido avisan</b>: cuando le falta agua, las hojas se caen en horas. Por eso un
        sensor que mide cada 15 minutos le viene tan bien.
      </p>

      <h3 className="subtitulo">Cuidados</h3>
      <div className="cuidados">
        {CUIDADOS.map(({ icono: Icono, tono, titulo, texto }) => (
          <article key={titulo} className="cuidado" style={{ "--tono": tono } as React.CSSProperties}>
            <div className="cuidado-icono">
              <Icono size={18} aria-hidden />
            </div>
            <h4>{titulo}</h4>
            <p>{texto}</p>
          </article>
        ))}
      </div>

      <div className="dos-columnas">
        <div>
          <h3 className="subtitulo">Qué dicen sus hojas</h3>
          <dl className="sintomas">
            {SINTOMAS.map((s) => (
              <div key={s.senal}>
                <dt>{s.senal}</dt>
                <dd>{s.causa}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="subtitulo">Curiosidades</h3>
          <ul className="curiosidades">
            {CURIOSIDADES.map((c) => (
              <li key={c}>
                <Sparkles size={16} aria-hidden />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <div className="aviso nota-mascotas" data-estado="bien">
            <PawPrint size={18} aria-hidden />
            <p>
              <b>Segura para mascotas.</b> Según la ASPCA, la albahaca no es tóxica para perros ni gatos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const PASOS = [
  { icono: Waves, nombre: "Sensor", texto: "capacitivo, mide la humedad" },
  { icono: Cpu, nombre: "ESP32-C3", texto: "lee cada 15 min y envía por WiFi" },
  { icono: Server, nombre: "Vercel", texto: "valida el token y guarda" },
  { icono: Database, nombre: "Supabase", texto: "base de datos y aviso en vivo" },
  { icono: Activity, nombre: "Esta web", texto: "se actualiza sola" },
];

export function ComoFunciona() {
  return (
    <section id="como" className="tarjeta revelar" aria-labelledby="t-como">
      <span className="ceja">Detrás de escena</span>
      <h2 id="t-como" className="tarjeta-titulo" style={{ marginTop: 6 }}>
        Cómo funciona
      </h2>
      <ol className="flujo">
        {PASOS.map(({ icono: Icono, nombre, texto }) => (
          <li key={nombre}>
            <span className="flujo-icono">
              <Icono size={22} aria-hidden />
            </span>
            <span>
              <b>{nombre}</b>
              {texto}
            </span>
          </li>
        ))}
      </ol>
      <p className="tenue" style={{ marginBottom: 16 }}>
        Si se corta el WiFi, la placa guarda las lecturas en memoria y las manda todas juntas cuando vuelve. La pantalla
        OLED muestra la humedad y cuándo toca regar, sin necesidad del celular.
      </p>
      <a className="enlace" href="https://github.com/alanschwegler1213/FinalIoT2026" target="_blank" rel="noreferrer">
        <BookOpen size={18} aria-hidden /> Ver el código en GitHub <ArrowRight size={16} aria-hidden />
      </a>
    </section>
  );
}
