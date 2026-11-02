-- =====================================================================
-- 07 · Cuento de El Principito (12 constelaciones, 51 estrellas)
-- ---------------------------------------------------------------------
-- Carga el cuento en TODOS los servidores. Requiere 06_cronicas_estrellas.sql.
-- Si se ejecuta otra vez, actualiza títulos y textos sin duplicar nada.
-- Las misiones se enlazan después, cuando se creen.
-- Generado con supabase/herramientas/generar_cuento.cjs
-- =====================================================================
do $do$
declare
  s     record;
  v_ord int;
  v_ant text;
  v_cap text;
begin
  for s in select id from servidores loop
    v_ant := null;

    -- 1. El aviador y el cordero
    v_cap := 'principito_01';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$El aviador y el cordero$t$, resumen = $t$Un piloto cae en el desierto y, al amanecer, una voz pequeña le pide algo que nadie le había pedido nunca.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$El aviador y el cordero$t$, $t$Un piloto cae en el desierto y, al amanecer, una voz pequeña le pide algo que nadie le había pedido nunca.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_01_1', v_cap, 1, $t$El dibujo número uno$t$, $t$De niño, el aviador vio en un libro de la selva una serpiente que se tragaba una fiera entera. Se quedó con esa imagen en la cabeza y dibujó a su manera una boa con un elefante dentro.

Les mostró el dibujo a los adultos esperando asustarlos, pero todos vieron un sombrero. Hizo un segundo dibujo, abriendo la boa para que se viera el elefante, y le dijeron que mejor estudiara cosas útiles. Así terminó su carrera de pintor antes de empezar.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_01_2', v_cap, 2, $t$Un motor en apuros$t$, $t$Creció, aprendió a volar y recorrió el mundo en su avión. Conoció a mucha gente importante y, de vez en cuando, les enseñaba aquel primer dibujo para ver si alguien lo entendía. Nadie lo entendió nunca, así que terminaba hablando de cosas de adultos.

Una tarde, sobre un desierto inmenso, el motor tosió y se apagó. El avión cayó sobre la arena, lejos de todo pueblo. Iba solo, sin mecánico, con agua para pocos días. Si quería salir de ahí, tendría que repararlo él mismo.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_01_3', v_cap, 3, $t$Una voz al amanecer$t$, $t$Esa noche durmió sobre la arena, más solo que nadie en el mundo. Al primer rayo de sol, una voz muy pequeña lo despertó para pedirle algo inesperado: que le dibujara un cordero.

Frente a él había un niño de cabello dorado, con una bufanda larga, tranquilo como si estuviera en el patio de su casa. No tenía hambre, ni sed, ni miedo. El aviador no entendía cómo había llegado hasta ahí, pero el niño repitió su pedido con tanta seriedad que no pudo negarse.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_01_4', v_cap, 4, $t$Dibújame un cordero$t$, $t$Como nunca había aprendido a dibujar corderos, el aviador le hizo su viejo dibujo de la boa. Para su sorpresa, el niño protestó enseguida: él no quería un elefante dentro de una serpiente. Por fin alguien lo entendía.

Entonces intentó con un cordero de verdad. El primero salió flaco y enfermo. El segundo tenía cuernos y parecía un carnero. El tercero se veía demasiado viejo. El niño los rechazó uno por uno, con paciencia: quería un cordero que le durara mucho tiempo.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_01_5', v_cap, 5, $t$La caja con agujeros$t$, $t$Cansado y apurado por volver al motor, el aviador dibujó una simple caja con unos agujeritos y le dijo que el cordero estaba dentro. El rostro del niño se llenó de alegría: era exactamente lo que quería.

Miró por los agujeros y aseguró que el cordero se había quedado dormido. Luego preguntó si comería mucha hierba, porque en su casa todo era muy pequeño. El aviador guardó esa frase como una pista: aquel niño no era de la Tierra.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 2. El asteroide B-612 y los baobabs
    v_cap := 'principito_02';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$El asteroide B-612 y los baobabs$t$, resumen = $t$El niño cuenta de dónde viene: un planeta del tamaño de una casa, con un peligro escondido bajo la tierra.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$El asteroide B-612 y los baobabs$t$, $t$El niño cuenta de dónde viene: un planeta del tamaño de una casa, con un peligro escondido bajo la tierra.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_02_1', v_cap, 1, $t$Un planeta del tamaño de una casa$t$, $t$Con los días, el aviador fue armando la historia. El niño venía de un planeta diminuto, apenas un poco más grande que una casa. Los astrónomos lo llamaban con un número: asteroide B-612.

No le pareció tan raro. Además de los planetas grandes y famosos, en el cielo hay muchísimos mundos pequeños que casi nadie conoce. Se imaginó al niño en el suyo: una casa, una silla y todo el cielo alrededor.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_02_2', v_cap, 2, $t$El traje del astrónomo$t$, $t$Ese asteroide solo lo había visto una vez un astrónomo con su telescopio. Cuando lo presentó ante otros sabios, nadie le creyó, porque iba vestido con la ropa típica de su tierra.

Tiempo después volvió a contar el mismo descubrimiento, esta vez con un traje elegante, y todos lo aplaudieron. Al aviador le pareció un buen ejemplo de cómo son los adultos: se fijan más en la ropa y en los números que en lo que de verdad importa.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_02_3', v_cap, 3, $t$Los brotes de cada mañana$t$, $t$El tercer día apareció el problema de los baobabs. En el planeta del niño había semillas buenas y semillas malas, y las de baobab eran terribles: si se las dejaba crecer, sus raíces podían atravesar el planeta entero.

Por eso tenía una rutina. Cada mañana revisaba la tierra y arrancaba los brotes de baobab en cuanto los reconocía, porque de pequeños se parecen mucho a los rosales. Era un trabajo aburrido, decía, pero muy fácil si se hace a tiempo.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_02_4', v_cap, 4, $t$El planeta del perezoso$t$, $t$El niño contó lo que le pasó a un planeta donde vivía un hombre perezoso. Vio tres brotes pequeños y pensó que podía arrancarlos otro día.

No hubo otro día. Los árboles crecieron, se apoderaron de todo y partieron aquel mundo en pedazos. El aviador, que hacía años no dibujaba, se esforzó en un dibujo grande de ese planeta para que los niños de la Tierra no cometieran el mismo error.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 3. Los volcanes y la rosa
    v_cap := 'principito_03';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$Los volcanes y la rosa$t$, resumen = $t$Atardeceres, una flor orgullosa y una despedida difícil: así fue como el principito dejó su hogar.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$Los volcanes y la rosa$t$, $t$Atardeceres, una flor orgullosa y una despedida difícil: así fue como el principito dejó su hogar.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_03_1', v_cap, 1, $t$Cuarenta y cuatro atardeceres$t$, $t$En su planeta, al niño le bastaba arrastrar la silla unos pasos para ver otra puesta de sol. Le gustaba tanto que una vez las vio decenas de veces seguidas en un solo día.

Le confesó al aviador que los atardeceres se disfrutan más cuando uno está triste. El aviador quiso preguntarle qué le había pasado ese día, pero el niño se quedó en silencio, mirando el horizonte.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_03_2', v_cap, 2, $t$Una flor distinta$t$, $t$Un día nació en su planeta una planta distinta, de una semilla que nadie sabía de dónde venía. El niño la cuidó y la vigiló mientras la flor tardaba días en prepararse, eligiendo sus colores con mucha calma.

Por fin abrió una mañana, con el sol. Era una rosa preciosa y lo sabía muy bien. Fingió estar recién despierta y algo desarreglada, aunque llevaba días preparándose para ese momento. El niño quedó maravillado.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_03_3', v_cap, 3, $t$Las cuatro espinas$t$, $t$La rosa resultó tener un carácter difícil. Presumió de sus cuatro espinas y aseguró que con ellas podía defenderse de cualquier fiera.

El niño le hizo notar que en su planeta no había fieras, y que además no les interesan las flores. Ella se ofendió por la comparación, y el niño terminó pidiéndole perdón sin saber muy bien por qué.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_03_4', v_cap, 4, $t$El biombo y el globo de cristal$t$, $t$Poco a poco la rosa fue pidiendo más cosas. De noche quería una cubierta de cristal porque decía tener frío. De día pedía una pantalla para que el viento no la molestara.

El niño la cuidaba con cariño, pero sus exigencias lo cansaban y algunas palabras lo lastimaban. Mucho después comprendería que debía haber mirado lo que la flor hacía por él, su perfume y su luz, y no tanto lo que decía.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_03_5', v_cap, 5, $t$Los tres volcanes$t$, $t$Decidió irse de viaje. Antes de partir dejó todo en orden: limpió sus dos volcanes encendidos, que le servían para calentar el desayuno, y también el que estaba apagado, por si acaso. Arrancó los últimos brotes y regó la flor por última vez.

Entonces la rosa dejó el orgullo a un lado y le dijo que lo quería, que se había portado mal y que ya no necesitaba la cubierta de cristal. Le pidió que se fuera pronto, para que no la viera llorar. El niño partió con el corazón apretado.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 4. El rey
    v_cap := 'principito_04';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$El rey$t$, resumen = $t$El primer asteroide del viaje lo ocupa un rey que cree mandar sobre todo, aunque no tiene a nadie a quien mandar.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$El rey$t$, $t$El primer asteroide del viaje lo ocupa un rey que cree mandar sobre todo, aunque no tiene a nadie a quien mandar.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_04_1', v_cap, 1, $t$Un rey sin súbditos$t$, $t$Comenzó visitando los pequeños asteroides de su vecindario. En el primero vivía un rey con un manto enorme, sentado en un trono, convencido de que todo el universo le pertenecía.

Apenas vio llegar al niño, se alegró de tener por fin a alguien a quien gobernar. Su manto ocupaba casi todo el planeta, así que el visitante no tuvo dónde sentarse y se quedó de pie.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_04_2', v_cap, 2, $t$Órdenes razonables$t$, $t$El niño bostezó de cansancio y el rey se lo prohibió; un momento después, para no quedar mal, le ordenó bostezar. El niño ya no sabía qué hacer.

El rey le explicó que él solo daba órdenes que se pudieran cumplir. Si quería que el sol se pusiera, esperaba la hora justa y entonces lo ordenaba. Así, decía, el sol siempre le obedecía.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_04_3', v_cap, 3, $t$El embajador$t$, $t$Cuando el niño quiso seguir su camino, el rey intentó retenerlo con un cargo: ministro de justicia. Pero no había nadie a quien juzgar, y el rey le dijo que entonces se juzgara a sí mismo, que era lo más difícil.

Como el niño insistió en irse, el rey, para no perder su autoridad, le gritó que lo nombraba su embajador. El niño se alejó pensando que los adultos eran gente muy curiosa.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 5. El vanidoso y el bebedor
    v_cap := 'principito_05';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$El vanidoso y el bebedor$t$, resumen = $t$Dos asteroides más y dos hombres que solo piensan en sí mismos.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$El vanidoso y el bebedor$t$, $t$Dos asteroides más y dos hombres que solo piensan en sí mismos.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_05_1', v_cap, 1, $t$El sombrero para saludar$t$, $t$En el segundo asteroide vivía un hombre al que le encantaba que lo admiraran. Para él, cualquier visitante era un admirador.

Llevaba un sombrero extravagante que usaba para agradecer los aplausos. El problema era que nunca pasaba nadie por su planeta, así que el sombrero casi no tenía trabajo.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_05_2', v_cap, 2, $t$Los que aplauden$t$, $t$Le pidió al niño que aplaudiera, y cada vez que lo hacía el hombre levantaba el sombrero con una gran reverencia. Al principio fue gracioso; después de un rato, el juego se volvió aburrido.

El vanidoso quería que el niño lo considerara el más guapo, el más elegante y el más listo de su planeta, aunque fuera el único habitante. Solo escuchaba los elogios; todo lo demás le entraba por un oído y le salía por el otro.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_05_3', v_cap, 3, $t$Las botellas del bebedor$t$, $t$En el tercer asteroide encontró a un hombre sentado en silencio entre muchas botellas, algunas llenas y otras vacías. La visita fue corta, pero lo dejó muy triste.

Le preguntó qué hacía y por qué. El hombre le contestó que bebía para olvidar algo que le daba vergüenza.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_05_4', v_cap, 4, $t$Un círculo sin salida$t$, $t$El niño, queriendo ayudar, le preguntó de qué se avergonzaba. El hombre respondió que se avergonzaba justamente de beber, y no volvió a hablar.

El niño se fue confundido, pensando que aquello era un círculo sin salida. Tal vez, si el hombre cambiara sus botellas por otra cosa, podría romperlo.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 6. El hombre de negocios
    v_cap := 'principito_06';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$El hombre de negocios$t$, resumen = $t$Un hombre tan ocupado contando estrellas que nunca levanta la vista para mirarlas.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$El hombre de negocios$t$, $t$Un hombre tan ocupado contando estrellas que nunca levanta la vista para mirarlas.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_06_1', v_cap, 1, $t$Quinientos millones$t$, $t$El cuarto asteroide era de un hombre de negocios tan ocupado que ni levantó la vista cuando llegó el niño. Sumaba números sin parar, uno tras otro, en voz baja.

Cuando por fin llegó a una cifra de varios cientos de millones, el niño quiso saber de qué. El hombre se quejó de las interrupciones: él era una persona seria y no tenía tiempo para preguntas.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_06_2', v_cap, 2, $t$Dueño de las estrellas$t$, $t$Al final admitió que contaba las estrellas, esos puntitos dorados del cielo. Decía que eran suyas porque a nadie se le había ocurrido quedárselas antes que a él.

El niño le preguntó para qué le servía tenerlas. Para ser rico, dijo el hombre. ¿Y para qué servía ser rico? Para comprar más estrellas, si alguien descubría otras. Al niño aquello le sonó igual de absurdo que lo del hombre de las botellas.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_06_3', v_cap, 3, $t$Poseer sirve si ayuda$t$, $t$El niño le contó que él tenía una flor a la que regaba cada día y tres volcanes que limpiaba cada semana. Tenerlos les hacía bien a ellos. En cambio, las estrellas no ganaban nada con tener un dueño así.

El hombre no supo qué contestar y el niño siguió su viaje, convencido de que tener algo solo vale la pena si uno lo cuida.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 7. El farolero
    v_cap := 'principito_07';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$El farolero$t$, resumen = $t$El planeta más pequeño de todos, y el único habitante que el principito habría querido como amigo.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$El farolero$t$, $t$El planeta más pequeño de todos, y el único habitante que el principito habría querido como amigo.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_07_1', v_cap, 1, $t$Un farol y un farolero$t$, $t$El quinto asteroide era el más chico de todos: solo había lugar para un farol y la persona que lo encendía. El niño no entendía para qué hacía falta un farol en un planeta sin casas ni gente.

Aun así le pareció un trabajo bonito. Encender el farol era como hacer nacer una estrella; apagarlo era como dejarla dormir. Y algo bonito, pensó, también es útil.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_07_2', v_cap, 2, $t$Buenas noches$t$, $t$Al llegar, el niño saludó y vio cómo el farolero encendía su farol en ese mismo momento.

Le preguntó por qué, y el farolero le explicó que seguía una orden muy antigua: encender el farol cuando cae la noche. La orden se dio hace mucho, cuando el planeta giraba despacio.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_07_3', v_cap, 3, $t$Buenos días$t$, $t$Un instante después, el farolero apagó el farol y dio los buenos días. Se secó la frente, agotado. Le contó al niño que antes su trabajo era tranquilo: apagaba por la mañana, encendía por la tarde y descansaba el resto del tiempo.

Pero el planeta había empezado a girar cada vez más rápido y la orden nunca cambió. Ahora los días duraban apenas un minuto y no le quedaba ni un momento para descansar.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_07_4', v_cap, 4, $t$Un amigo posible$t$, $t$El niño le propuso un truco: como el planeta era tan pequeño, si caminaba despacio siempre podría quedarse al sol. Pero al farolero lo que más le gustaba era dormir, y el truco no le servía.

Al irse, el niño pensó que de todos los adultos que había conocido, ese era el único que no le parecía ridículo, porque se ocupaba de algo más que de sí mismo. Le habría gustado ser su amigo, pero en ese planeta no cabían dos.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 8. El geógrafo
    v_cap := 'principito_08';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$El geógrafo$t$, resumen = $t$Un sabio que escribe sobre el mundo sin haberlo visto le enseña al principito una palabra que lo cambia todo.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$El geógrafo$t$, $t$Un sabio que escribe sobre el mundo sin haberlo visto le enseña al principito una palabra que lo cambia todo.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_08_1', v_cap, 1, $t$El anciano de los libros enormes$t$, $t$El sexto asteroide era mucho más grande. Allí vivía un anciano que escribía libros gigantescos. Al ver al niño, lo recibió como a un explorador recién llegado.

Le explicó que era geógrafo: un sabio que sabe dónde están los mares, los ríos, las montañas y los desiertos. Al niño le pareció, por fin, un oficio de verdad.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_08_2', v_cap, 2, $t$Pruebas de los exploradores$t$, $t$Pero cuando le preguntó cómo era su propio planeta, el geógrafo no lo sabía. Él no salía nunca de su escritorio; para eso estaban los exploradores, que viajaban y le contaban lo que veían.

Eso sí, solo anotaba lo que venía con pruebas: si alguien le hablaba de una montaña, debía traerle piedras de esa montaña. Entusiasmado, le pidió al niño que le describiera su planeta.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_08_3', v_cap, 3, $t$Efímero$t$, $t$El niño le habló de sus volcanes y de su flor. El geógrafo le dijo que las flores no se anotan, porque son pasajeras: pueden desaparecer pronto. Lo que importa son las montañas y los mares, que duran.

Al oír eso, el niño pensó en su rosa, que solo tenía cuatro espinas para defenderse, y que él había dejado sola. Por primera vez se arrepintió de haberse ido.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_08_4', v_cap, 4, $t$Rumbo a la Tierra$t$, $t$Aun así, juntó valor y le pidió consejo para seguir su viaje.

El geógrafo le recomendó visitar la Tierra, un planeta con buena fama. Y hacia allá partió el niño, pensando en su flor.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 9. La Tierra, la serpiente y la flor del desierto
    v_cap := 'principito_09';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$La Tierra, la serpiente y la flor del desierto$t$, resumen = $t$El séptimo planeta es la Tierra. El principito llega solo, al desierto, y lo primero que encuentra no es una persona.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$La Tierra, la serpiente y la flor del desierto$t$, $t$El séptimo planeta es la Tierra. El principito llega solo, al desierto, y lo primero que encuentra no es una persona.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_09_1', v_cap, 1, $t$Un planeta lleno de gente$t$, $t$La Tierra no se parecía a nada que el niño conociera. En ella había cientos de reyes, miles de geógrafos y millones de hombres de negocios, de vanidosos y de bebedores. Para encender todos sus faroles hacía falta un verdadero ejército.

Sin embargo, el niño aterrizó en pleno desierto y no vio a nadie. Por un momento creyó que se había equivocado de planeta.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_09_2', v_cap, 2, $t$La serpiente del color de la luna$t$, $t$Entre la arena se movió algo del color de la luna: una serpiente. El niño le preguntó dónde estaba la gente, porque se sentía solo. La serpiente le respondió que entre la gente uno también puede sentirse solo.

Era fina como un dedo, pero dijo tener un poder enorme: con un solo toque podía devolver a cualquiera al lugar de donde vino. Le ofreció ayuda para el día en que extrañara demasiado su planeta. El niño entendió lo que quería decir y no contestó.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_09_3', v_cap, 3, $t$La flor de tres pétalos$t$, $t$Cruzando el desierto, el niño solo encontró una florecita humilde de tres pétalos. Le preguntó por la gente.

La flor recordaba haber visto pasar una caravana hacía años. Le dijo que había pocas personas y que el viento las llevaba de un lado a otro, porque no tenían raíces, y que eso las ponía tristes.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_09_4', v_cap, 4, $t$El eco$t$, $t$Después subió a una montaña altísima. Las únicas que conocía eran sus volcanes, que le llegaban a la rodilla, así que pensó que desde allí arriba vería el planeta entero. Solo vio rocas puntiagudas.

Saludó a gritos y el eco le devolvió sus propias palabras. Preguntó quién estaba ahí y el eco repitió la pregunta. Qué planeta tan extraño, pensó: seco, áspero, y con gente que solo repite lo que oye.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_09_5', v_cap, 5, $t$Un campamento en el camino$t$, $t$Bajó de la montaña y caminó durante mucho tiempo por arena, por piedras y por nieve. Al caer la tarde buscó un rincón tranquilo cerca de las flores del desierto para descansar.

Mirando el fuego, recordó su planeta, donde bastaba mover la silla para ver otro atardecer. Aquí los caminos eran largos y no terminaban nunca. Aun así decidió seguir: en algún lugar tenía que haber un camino que lo llevara hasta la gente.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 10. El jardín de rosas y el zorro
    v_cap := 'principito_10';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$El jardín de rosas y el zorro$t$, resumen = $t$Cinco mil rosas iguales a la suya, y un zorro que le enseña por qué la suya es única.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$El jardín de rosas y el zorro$t$, $t$Cinco mil rosas iguales a la suya, y un zorro que le enseña por qué la suya es única.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_10_1', v_cap, 1, $t$Cinco mil rosas$t$, $t$Por fin dio con un camino, y los caminos siempre llevan hacia las personas. Llegó a un jardín lleno de rosas, todas idénticas a la suya.

Sintió una pena enorme. Su flor le había asegurado que era única en todo el universo, y allí había miles iguales en un solo jardín. Creía tener un tesoro, y ahora pensaba que tenía una rosa común y corriente. Se recostó en la hierba y lloró.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_10_2', v_cap, 2, $t$Domesticar$t$, $t$En ese momento apareció un zorro. El niño lo invitó a jugar, pero el zorro le explicó que no podía, porque no estaba domesticado. Domesticar, le dijo, es crear lazos.

Sin esos lazos, el niño era para él uno más entre muchísimos niños, y él un zorro más entre muchísimos zorros. Pero si se domesticaban, cada uno sería único para el otro. Y le pidió, por favor, que lo domesticara.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_10_3', v_cap, 3, $t$Los ritos$t$, $t$El zorro le explicó cómo hacerlo: con paciencia, sentándose cada día un poco más cerca, en silencio, porque las palabras a veces confunden.

También le pidió que volviera siempre a la misma hora. Así, le dijo, empezaría a ponerse contento desde antes, esperando el momento del encuentro. Para eso sirven los ritos: hacen que un día sea distinto de los demás.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_10_4', v_cap, 4, $t$El tiempo que perdiste por tu rosa$t$, $t$Llegó el día de partir y el zorro dijo que lloraría. El niño se sintió culpable, pero el zorro le explicó que había ganado algo: el color del trigo, que desde entonces le recordaría el cabello de su amigo.

Le pidió que volviera a ver las rosas. El niño fue y entendió: ninguna de ellas era como la suya, porque a la suya la había regado, protegido y escuchado. Esa la hacía única.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_10_5', v_cap, 5, $t$El secreto$t$, $t$Al despedirse, el zorro le regaló un secreto muy simple: solo se ve bien con el corazón, porque lo más importante no se ve con los ojos.

Y añadió que lo que hacía tan valiosa a su rosa era todo el tiempo que le había dedicado. Le recordó que uno se vuelve responsable de lo que ha domesticado. El niño lo repitió en voz baja para no olvidarlo.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 11. El guardagujas, el mercader y el pozo
    v_cap := 'principito_11';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$El guardagujas, el mercader y el pozo$t$, resumen = $t$Trenes que no saben adónde van, tiempo que se ahorra para nada y un pozo que aparece al amanecer.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$El guardagujas, el mercader y el pozo$t$, $t$Trenes que no saben adónde van, tiempo que se ahorra para nada y un pozo que aparece al amanecer.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_11_1', v_cap, 1, $t$El guardagujas$t$, $t$Más adelante conoció a un hombre que trabajaba en las vías del tren, desviando los vagones llenos de viajeros hacia un lado o hacia el otro.

Pasaban trenes rugiendo en ambas direcciones, y el hombre le contó que la gente nunca está conforme con el lugar donde está. Casi todos iban dormidos o aburridos; solo los niños miraban por las ventanas con la nariz pegada al vidrio. El principito pensó que los niños sí saben lo que buscan.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_11_2', v_cap, 2, $t$Las píldoras contra la sed$t$, $t$Luego encontró a un vendedor de pastillas que quitaban la sed. Con una por semana, decía, ya no hacía falta beber, y así se ahorraba un montón de minutos.

El niño le preguntó qué hacía la gente con todo ese tiempo ahorrado. Lo que quisiera, respondió el vendedor. El niño pensó que él usaría esos minutos para caminar sin prisa hacia una fuente de agua.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_11_3', v_cap, 3, $t$El pozo$t$, $t$Al aviador se le había terminado el agua. El niño le propuso buscar un pozo y caminaron toda la noche bajo las estrellas. El niño decía que el desierto era hermoso porque en algún lado escondía agua.

Al amanecer encontraron un pozo con su polea y su balde. El aviador sacó agua y el niño bebió con los ojos cerrados. No era solo agua: era el regalo de la caminata, de la noche y del esfuerzo compartido.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_11_4', v_cap, 4, $t$Lo que se busca$t$, $t$El niño comentó que la gente cultiva miles de rosas y aun así no encuentra lo que busca, cuando podría encontrarlo en una sola flor o en un poco de agua. Solo hay que buscar con el corazón.

Luego se quedó mirando el cielo. Pronto se cumpliría un año desde su llegada a la Tierra, justo sobre ese mismo lugar. El aviador sintió una tristeza que no sabía explicar.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_11_5', v_cap, 5, $t$La puerta a otro mundo$t$, $t$Cuando el aviador terminó de reparar el motor, encontró al niño sentado sobre un muro de piedra, conversando con alguien que no veía. Al acercarse descubrió a la serpiente, que se escabulló entre las rocas.

El niño, muy serio, le contó que él también volvía a casa ese día. Su camino era mucho más largo y difícil, y su estrella estaría justo encima del lugar donde había caído un año atrás.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;

    -- 12. Las estrellas y la despedida
    v_cap := 'principito_12';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = $t$Las estrellas y la despedida$t$, resumen = $t$La última noche del principito en la Tierra, y el regalo que le deja al aviador para siempre.$t$, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, $t$Las estrellas y la despedida$t$, $t$La última noche del principito en la Tierra, y el regalo que le deja al aviador para siempre.$t$, v_ant, true);
    end if;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_12_1', v_cap, 1, $t$Una estrella entre todas$t$, $t$Esa noche el niño le habló de las estrellas. Para unos son guías, para otros solo lucecitas, y para algunos son números o riquezas. Pero las del aviador serían distintas a las de todos.

Su estrella sería demasiado pequeña para señalarla, y eso estaba bien: así el aviador miraría todas con cariño, sin saber en cuál vivía su amigo.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_12_2', v_cap, 2, $t$Quinientos millones de cascabeles$t$, $t$Le prometió que, como él viviría en una de ellas y desde allí se reiría, al aviador le parecería que todas las estrellas reían a la vez.

Y cuando se le pasara la tristeza, porque siempre se pasa, se alegraría de haberlo conocido y saldría a mirar el cielo solo por gusto. Sería como si, en vez de estrellas, le hubiera regalado cascabeles.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_12_3', v_cap, 3, $t$La cáscara vieja$t$, $t$El niño se escapó en silencio y el aviador lo alcanzó cuando ya caminaba hacia el lugar del encuentro. Le explicó que su cuerpo era demasiado pesado para un viaje tan largo y que lo dejaría atrás, como una cáscara vacía. No había que estar triste por eso.

Le pidió dar el último paso solo. Hubo un destello amarillo junto a su tobillo, y el niño cayó despacio sobre la arena, sin un solo ruido.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, 'principito_12_4', v_cap, 4, $t$El paisaje más bonito y más triste$t$, $t$A la mañana siguiente el aviador no encontró su cuerpo y comprendió que había vuelto a su estrella. Reparó su avión y regresó a casa. Desde entonces, por las noches, escucha las estrellas como si sonaran cascabeles.

Solo una duda lo inquieta: ¿se habrá comido el cordero la flor? Si alguna vez cruzas un desierto y ves a un niño de cabello dorado que ríe y no responde preguntas, ya sabes quién es. Avísale al aviador que el principito volvió.$t$)
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
    v_ant := v_cap;
  end loop;
  update sincronizacion set version_contenido = version_contenido + 1;
end $do$;

select servidor, count(*) as estrellas from estrellas where capitulo_id like 'principito_%' group by servidor order by servidor;
