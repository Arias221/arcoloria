// Textos en lenguaje natural para jugadores.
// Copiado de la página (site/misiones/js/comun.js) para que el juego y la web digan lo mismo.

function limpiarId(id) { return String(id || '').replace(/^minecraft:/, ''); }
function bonito(id) { var s = limpiarId(id).replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }

var ENTIDADES = {
  zombie: ['zombi', 'zombis'], zombie_villager: ['aldeano zombi', 'aldeanos zombis'], husk: ['zombi momificado', 'zombis momificados'], drowned: ['ahogado', 'ahogados'],
  skeleton: ['esqueleto', 'esqueletos'], stray: ['esqueleto glacial', 'esqueletos glaciales'], bogged: ['esqueleto pantanoso', 'esqueletos pantanosos'], wither_skeleton: ['esqueleto wither', 'esqueletos wither'],
  creeper: ['creeper', 'creepers'], spider: ['araña', 'arañas'], cave_spider: ['araña de cueva', 'arañas de cueva'], enderman: ['enderman', 'endermen'], endermite: ['endermite', 'endermites'],
  ghast: ['ghast', 'ghasts'], blaze: ['blaze', 'blazes'], magma_cube: ['cubo de magma', 'cubos de magma'], slime: ['slime', 'slimes'], shulker: ['shulker', 'shulkers'],
  witch: ['bruja', 'brujas'], phantom: ['phantom', 'phantoms'], pillager: ['saqueador', 'saqueadores'], vindicator: ['vindicador', 'vindicadores'], evoker: ['invocador', 'invocadores'],
  ravager: ['devastador', 'devastadores'], vex: ['vex', 'vexes'], guardian: ['guardián', 'guardianes'], elder_guardian: ['guardián anciano', 'guardianes ancianos'],
  piglin: ['piglin', 'piglins'], piglin_brute: ['piglin bruto', 'piglins brutos'], zombified_piglin: ['piglin zombificado', 'piglins zombificados'], hoglin: ['hoglin', 'hoglins'], zoglin: ['zoglin', 'zoglins'],
  silverfish: ['lepisma', 'lepismas'], warden: ['warden', 'wardens'], wither: ['Wither', 'Withers'], ender_dragon: ['dragón del End', 'dragones del End'], breeze: ['breeze', 'breezes'],
  cow: ['vaca', 'vacas'], pig: ['cerdo', 'cerdos'], sheep: ['oveja', 'ovejas'], chicken: ['gallina', 'gallinas'], rabbit: ['conejo', 'conejos'], horse: ['caballo', 'caballos'], donkey: ['burro', 'burros'],
  mule: ['mula', 'mulas'], camel: ['camello', 'camellos'], llama: ['llama', 'llamas'], villager: ['aldeano', 'aldeanos'], wandering_trader: ['comerciante errante', 'comerciantes errantes'],
  wolf: ['lobo', 'lobos'], cat: ['gato', 'gatos'], fox: ['zorro', 'zorros'], bee: ['abeja', 'abejas'], goat: ['cabra', 'cabras'], frog: ['rana', 'ranas'], axolotl: ['ajolote', 'ajolotes'],
  turtle: ['tortuga', 'tortugas'], panda: ['panda', 'pandas'], polar_bear: ['oso polar', 'osos polares'], iron_golem: ['gólem de hierro', 'gólems de hierro'], allay: ['allay', 'allays'],
  squid: ['calamar', 'calamares'], glow_squid: ['calamar brillante', 'calamares brillantes'], dolphin: ['delfín', 'delfines'], cod: ['bacalao', 'bacalaos'], salmon: ['salmón', 'salmones'],
  strider: ['strider', 'striders'], sniffer: ['sniffer', 'sniffers'], armadillo: ['armadillo', 'armadillos'], parrot: ['loro', 'loros'], bat: ['murciélago', 'murciélagos']
};
var COSAS = {
  bow: 'un arco', crossbow: 'una ballesta', trident: 'un tridente', mace: 'una maza', shield: 'un escudo', fishing_rod: 'una caña de pescar', shears: 'unas tijeras', flint_and_steel: 'un mechero',
  wooden_sword: 'una espada de madera', stone_sword: 'una espada de piedra', iron_sword: 'una espada de hierro', golden_sword: 'una espada de oro', diamond_sword: 'una espada de diamante', netherite_sword: 'una espada de netherita',
  wooden_axe: 'un hacha de madera', stone_axe: 'un hacha de piedra', iron_axe: 'un hacha de hierro', golden_axe: 'un hacha de oro', diamond_axe: 'un hacha de diamante', netherite_axe: 'un hacha de netherita',
  wooden_pickaxe: 'un pico de madera', stone_pickaxe: 'un pico de piedra', iron_pickaxe: 'un pico de hierro', golden_pickaxe: 'un pico de oro', diamond_pickaxe: 'un pico de diamante', netherite_pickaxe: 'un pico de netherita',
  wooden_shovel: 'una pala de madera', iron_shovel: 'una pala de hierro', diamond_shovel: 'una pala de diamante', iron_hoe: 'una azada de hierro', diamond_hoe: 'una azada de diamante',
  iron_helmet: 'un casco de hierro', diamond_helmet: 'un casco de diamante', golden_helmet: 'un casco de oro', leather_helmet: 'un casco de cuero', turtle_helmet: 'un caparazón de tortuga', carved_pumpkin: 'una calabaza tallada',
  iron_chestplate: 'una pechera de hierro', diamond_chestplate: 'una pechera de diamante', elytra: 'unas élitros', iron_leggings: 'unas grebas de hierro', diamond_leggings: 'unas grebas de diamante',
  iron_boots: 'unas botas de hierro', diamond_boots: 'unas botas de diamante', leather_boots: 'unas botas de cuero', totem_of_undying: 'un tótem de la inmortalidad', torch: 'una antorcha'
};
var NOMBRES = {
  wheat: 'trigo', bread: 'pan', apple: 'manzanas', golden_apple: 'manzanas doradas', carrot: 'zanahorias', potato: 'papas', cooked_beef: 'filetes', diamond: 'diamantes', emerald: 'esmeraldas',
  iron_ingot: 'lingotes de hierro', gold_ingot: 'lingotes de oro', coal: 'carbón', ghast_tear: 'lágrimas de ghast', blaze_rod: 'varas de blaze', ender_pearl: 'perlas de ender', string: 'hilo',
  oak_log: 'troncos de roble', oak_planks: 'tablas de roble', cobblestone: 'piedra labrada', stone: 'piedra', dirt: 'tierra', sand: 'arena', glass: 'vidrio', torch: 'antorchas', bed: 'camas',
  diamond_ore: 'menas de diamante', deepslate_diamond_ore: 'menas de diamante de pizarra', iron_ore: 'menas de hierro', gold_ore: 'menas de oro', coal_ore: 'menas de carbón', ancient_debris: 'escombros ancestrales',
  amethyst_cluster: 'racimos de amatista', amethyst_shard: 'fragmentos de amatista', cherry_log: 'troncos de cerezo', cherry_leaves: 'hojas de cerezo', pumpkin: 'calabazas', melon: 'sandías',
  sweet_berries: 'bayas dulces', honey_bottle: 'botellas de miel', milk_bucket: 'cubos de leche', potion: 'pociones', cake: 'pasteles', chest: 'cofres', crafting_table: 'mesas de trabajo', furnace: 'hornos',
  grass_block: 'bloques de césped', obsidian: 'obsidiana', netherrack: 'netherrack', end_stone: 'piedra del End', bell: 'campanas', lever: 'palancas', stone_button: 'botones', oak_door: 'puertas de roble'
};
var BLOQUE_SING = { grass_block: 'un bloque de césped', sand: 'arena', stone: 'piedra', diamond_block: 'un bloque de diamante', gold_block: 'un bloque de oro', obsidian: 'obsidiana', ice: 'hielo', snow: 'nieve', netherrack: 'netherrack', end_stone: 'piedra del End', soul_sand: 'arena de almas', magma_block: 'un bloque de magma', slime_block: 'un bloque de slime', honey_block: 'un bloque de miel' };
var METODOS = {
  entityAttack: 'cuerpo a cuerpo', projectile: 'con flechas o proyectiles', fall: 'haciéndolo caer', fire: 'con fuego', fireTick: 'con fuego', lava: 'con lava', drowning: 'ahogándolo', magic: 'con magia',
  lightning: 'con un rayo', blockExplosion: 'con una explosión', entityExplosion: 'con una explosión', void: 'lanzándolo al vacío', maceSmash: 'con un golpe de maza', freezing: 'congelándolo',
  thorns: 'con espinas', anvil: 'con un yunque', suffocation: 'asfixiándolo', sonicBoom: 'con un estallido sónico', contact: 'con cactus o arbustos', wither: 'con el efecto wither', campfire: 'con una fogata', stalactite: 'con una estalactita', stalagmite: 'con una estalagmita'
};
var ENCANTAMIENTOS = {
  sharpness: 'Filo', smite: 'Golpe', bane_of_arthropods: 'Perdición de los artrópodos', knockback: 'Empuje', fire_aspect: 'Aspecto ígneo', looting: 'Botín', sweeping: 'Filo arrasador',
  power: 'Poder', punch: 'Retroceso', flame: 'Fuego', infinity: 'Infinidad', multishot: 'Multidisparo', piercing: 'Perforación', quick_charge: 'Carga rápida',
  efficiency: 'Eficiencia', fortune: 'Fortuna', silk_touch: 'Toque de seda', unbreaking: 'Irrompibilidad', mending: 'Reparación', protection: 'Protección', fire_protection: 'Protección contra el fuego',
  blast_protection: 'Protección contra explosiones', projectile_protection: 'Protección contra proyectiles', feather_falling: 'Caída de pluma', thorns: 'Espinas', respiration: 'Respiración',
  aqua_affinity: 'Afinidad acuática', depth_strider: 'Agilidad acuática', frost_walker: 'Paso helado', soul_speed: 'Velocidad de almas', swift_sneak: 'Sigilo rápido',
  loyalty: 'Lealtad', riptide: 'Propulsión acuática', channeling: 'Conductividad', impaling: 'Empalamiento', lure: 'Atracción', luck_of_the_sea: 'Suerte marina', density: 'Densidad', breach: 'Brecha', wind_burst: 'Ráfaga de viento'
};
var EFECTOS = {
  speed: 'Velocidad', slowness: 'Lentitud', haste: 'Prisa', mining_fatigue: 'Fatiga minera', strength: 'Fuerza', instant_health: 'Curación instantánea', jump_boost: 'Salto', nausea: 'Náuseas',
  regeneration: 'Regeneración', resistance: 'Resistencia', fire_resistance: 'Resistencia al fuego', water_breathing: 'Respiración acuática', invisibility: 'Invisibilidad', blindness: 'Ceguera',
  night_vision: 'Visión nocturna', hunger: 'Hambre', weakness: 'Debilidad', poison: 'Veneno', wither: 'Wither', health_boost: 'Vida extra', absorption: 'Absorción', saturation: 'Saturación',
  levitation: 'Levitación', slow_falling: 'Caída lenta', conduit_power: 'Poder del conducto', darkness: 'Oscuridad', bad_omen: 'Mal presagio', hero_of_the_village: 'Héroe de la aldea'
};
var BIOMAS = {
  plains: 'Llanura', sunflower_plains: 'Llanura de girasoles', forest: 'Bosque', flower_forest: 'Bosque florido', birch_forest: 'Bosque de abedules', dark_forest: 'Bosque oscuro', cherry_grove: 'Arboleda de cerezos',
  taiga: 'Taiga', snowy_taiga: 'Taiga nevada', jungle: 'Jungla', bamboo_jungle: 'Jungla de bambú', savanna: 'Sabana', desert: 'Desierto', badlands: 'Tierras baldías', swamp: 'Pantano', mangrove_swamp: 'Manglar',
  meadow: 'Pradera', snowy_plains: 'Llanura nevada', ice_spikes: 'Picos de hielo', mushroom_fields: 'Campos de champiñones', beach: 'Playa', river: 'Río', ocean: 'Océano', deep_ocean: 'Océano profundo',
  lush_caves: 'Cuevas frondosas', dripstone_caves: 'Cuevas de espeleotemas', deep_dark: 'Oscuridad profunda', jagged_peaks: 'Picos escarpados', frozen_peaks: 'Picos helados', stony_peaks: 'Picos rocosos',
  nether_wastes: 'Páramos del Nether', soul_sand_valley: 'Valle de arena de almas', crimson_forest: 'Bosque carmesí', warped_forest: 'Bosque distorsionado', basalt_deltas: 'Deltas de basalto', the_end: 'End'
};
var DIMENSIONES = { overworld: 'en el mundo normal', nether: 'en el Nether', end: 'en el End' };
var CLIMAS = { clear: 'con cielo despejado', rain: 'mientras llueve', thunder: 'durante una tormenta' };
var HORAS = { day: 'de día', noon: 'al mediodía', sunset: 'al atardecer', night: 'de noche', midnight: 'a medianoche', sunrise: 'al amanecer' };
var LUNAS = { fullmoon: 'con luna llena', newMoon: 'con luna nueva', firstQuarter: 'en cuarto creciente', lastQuarter: 'en cuarto menguante', waxingCrescent: 'con luna creciente', waningCrescent: 'con luna menguante', waxingGibbous: 'con luna gibosa creciente', waningGibbous: 'con luna gibosa menguante' };
var PLATAFORMAS = { console: 'jugando en consola', desktop: 'jugando en PC', mobile: 'jugando en celular' };
var RANURAS = { helmet: 'en la cabeza', chestplate: 'en el pecho', leggings: 'en las piernas', boots: 'en los pies', offhand: 'en la mano izquierda' };
var VERBOS = { matar: 'Derrota a', romper: 'Rompe', colocar: 'Coloca', usar: 'Usa', interactuar: 'Interactúa con', consumir: 'Come o bebe', obtener: 'Consigue' };

function nombreEntidad(id, cantidad) {
  var k = limpiarId(id), e = ENTIDADES[k];
  if (e) return cantidad === 1 ? e[0] : e[1];
  return bonito(id).toLowerCase();
}
function nombreCosa(id, cantidad) {
  var k = limpiarId(id);
  if (cantidad === 1 && COSAS[k]) return COSAS[k].replace(/^(un|una|unas|unos) /, '');
  return NOMBRES[k] || (COSAS[k] ? COSAS[k].replace(/^(un|una|unas|unos) /, '') : bonito(id).toLowerCase());
}
function conArticulo(id) { var k = limpiarId(id); return COSAS[k] || ('«' + bonito(id) + '»'); }
function nombreObjetivo(o) {
  var n = Number(o.cantidad) || 1;
  var esEntidad = o.tipo === 'matar' || o.tipo === 'interactuar' || ENTIDADES[limpiarId(o.objetivo)];
  return n + ' ' + (esEntidad ? nombreEntidad(o.objetivo, n) : nombreCosa(o.objetivo, n));
}
function textoObjetivo(o) {
  if (o.descripcion && String(o.descripcion).trim()) return String(o.descripcion).trim();
  return (VERBOS[o.tipo] || 'Completa') + ' ' + nombreObjetivo(o);
}
function corazones(v) { var h = Number(v) / 2; return (h % 1 ? h.toFixed(1) : h) + (h === 1 ? ' corazón' : ' corazones'); }
function frasesCondiciones(c) {
  c = c || {};
  var f = [];
  if (c.herramienta) f.push('usando ' + conArticulo(c.herramienta));
  if (c.metodo) f.push(METODOS[c.metodo] || ('con el método «' + c.metodo + '»'));
  if (c.dimension) f.push(DIMENSIONES[c.dimension] || ('en ' + c.dimension));
  if (c.bioma) f.push('en ' + (BIOMAS[limpiarId(c.bioma)] ? 'el bioma ' + BIOMAS[limpiarId(c.bioma)] : 'el bioma «' + bonito(c.bioma) + '»'));
  if (c.hora_del_dia) f.push(HORAS[c.hora_del_dia] || c.hora_del_dia);
  if (c.fase_lunar) f.push(LUNAS[c.fase_lunar] || c.fase_lunar);
  if (c.clima) f.push(CLIMAS[c.clima] || c.clima);
  if (c.zona) { var z = c.zona; f.push('dentro de la zona entre ' + z.x1 + ', ' + z.y1 + ', ' + z.z1 + ' y ' + z.x2 + ', ' + z.y2 + ', ' + z.z2); }
  if (c.altura) f.push((c.altura.tipo === 'debajo' ? 'por debajo' : 'por encima') + ' de la altura ' + c.altura.valor);
  if (c.ubicacion_objetivo) { var u = c.ubicacion_objetivo; f.push('en las coordenadas ' + u.x + ', ' + u.y + ', ' + u.z); }
  if (c.cerca_de) f.push('a menos de ' + c.cerca_de.radio + ' bloques de ' + (ENTIDADES[limpiarId(c.cerca_de.entidad)] ? 'un ' + ENTIDADES[limpiarId(c.cerca_de.entidad)][0] : '«' + bonito(c.cerca_de.entidad) + '»'));
  if (c.montado) f.push('montado en ' + (ENTIDADES[limpiarId(c.montado)] ? 'un ' + ENTIDADES[limpiarId(c.montado)][0] : '«' + bonito(c.montado) + '»'));
  if (c.sin_dano) f.push('sin recibir daño');
  if (c.encantamiento) f.push('con el encantamiento ' + (ENCANTAMIENTOS[limpiarId(c.encantamiento.id)] || bonito(c.encantamiento.id)) + (c.encantamiento.nivel ? ' ' + romano(c.encantamiento.nivel) : ''));
  if (c.vida) f.push('con ' + (c.vida.tipo === 'debajo' ? 'menos' : 'más') + ' de ' + corazones(c.vida.valor) + ' de vida');
  if (c.efecto) f.push('con el efecto ' + (EFECTOS[limpiarId(c.efecto.id)] || bonito(c.efecto.id)) + (c.efecto.nivel ? ' ' + romano(c.efecto.nivel) : ''));
  if (c.hambre) f.push('con ' + (c.hambre.tipo === 'debajo' ? 'menos' : 'más') + ' de ' + (Number(c.hambre.valor) / 2) + ' muslos de comida');
  if (c.nivel) f.push('con nivel de experiencia ' + c.nivel + ' o más');
  if (c.puntaje) f.push('con al menos ' + c.puntaje.valor + ' puntos de «' + c.puntaje.objetivo + '»');
  if (c.bajo_agua) f.push('bajo el agua');
  if (c.agachado) f.push('agachado');
  if (c.en_llamas) f.push('en llamas');
  if (c.en_aire) f.push('en el aire');
  if (c.sin_armadura) f.push('sin armadura');
  if (c.plataforma) f.push(PLATAFORMAS[c.plataforma] || c.plataforma);
  if (c.equipo) f.push('llevando ' + conArticulo(c.equipo.item) + ' ' + (RANURAS[c.equipo.ranura] || ''));
  if (c.sobre_bloque) f.push('parado sobre ' + (BLOQUE_SING[limpiarId(c.sobre_bloque)] || '«' + bonito(c.sobre_bloque) + '»'));
  if (c.etiqueta) f.push('con la marca especial «' + c.etiqueta + '»');
  return f;
}
function romano(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Number(n)] || String(n); }
function textoDuracion(seg) {
  seg = Number(seg) || 0;
  var h = Math.floor(seg / 3600), m = Math.round((seg % 3600) / 60);
  if (h && m) return h + ' h ' + m + ' min';
  if (h) return h + (h === 1 ? ' hora' : ' horas');
  return m + (m === 1 ? ' minuto' : ' minutos');
}
function textoRepeticion(m) {
  if (m.categoria === 'historia' || m.repeticion === 'una_vez' || !m.repeticion) return 'Se completa una sola vez';
  if (m.repeticion === 'por_dia') { var v = Number(m.repeticion_veces) || 1; return v === 1 ? 'Se puede repetir una vez al día' : 'Se puede repetir hasta ' + v + ' veces al día'; }
  if (m.repeticion === 'cada_horas') { var h = Number(m.repeticion_horas) || 1; return 'Se puede repetir cada ' + h + (h === 1 ? ' hora' : ' horas'); }
  return '';
}


export { limpiarId, bonito, nombreEntidad, nombreCosa, textoObjetivo, frasesCondiciones, textoRepeticion, textoDuracion };
