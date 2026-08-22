import { Link } from 'react-router-dom'

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-fg">
          Cómo usar?
        
        </h1>
        <p className="mt-2 text-fg-muted">
          Pasos para pedir ayuda, donar, abrir un centro de acopio o mover
          suministros tras el terremoto en Colombia.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-fg">1. Si necesitas ayuda</h2>
        <p className="mt-2 text-fg-muted">
          Publica tu solicitud en{' '}
          <Link to="/pedir-ayuda" className="text-primary underline">
            Pedir ayuda
          </Link>
          . Describe qué necesitas (agua, alimentos, atención médica), 
          la ciudad y un punto de referencia. Tu solicitud queda
          visible para quienes puedan ayudar cerca de ti.
        </p>
        <p className="mt-2 text-fg-muted">
          También puedes acercarte a un centro de acopio o albergue desde la{' '}
          <Link to="/red-de-ayudas" className="text-primary underline">
            Red de ayudas
          </Link>
          , o contactar directamente a quienes publican una oferta de lo que
          necesitas. Cuando alguien pulse{' '}
          <span className="font-medium text-fg">Voy a ayudar</span> en tu
          publicación, se comunica contigo usando la información de contacto
          que publicaste; si la ayuda requiere transporte que el voluntario no
          puede mover, tu solicitud también se difunde en el{' '}
          <Link to="/transporte" className="text-primary underline">
            Centro de carga
          </Link>{' '}
          para que alguien más la recoja.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-fg">2. Si quieres ayudar</h2>
        <p className="mt-2 text-fg-muted">
          Puedes ofrecer lo que tienes en{' '}
          <Link to="/ofrecer-ayuda" className="text-primary underline">
            Ofrecer ayuda
          </Link>{' '}
          (donaciones, trabajo voluntario) indicando ciudad y disponibilidad;
          si no puedes transportar lo que ofreces, la oferta aparece en el{' '}
          <Link to="/transporte" className="text-primary underline">
            Centro de carga
          </Link>{' '}
          para que alguien más la mueva. También puedes donar directamente a un
          punto físico comunicándote con un{' '}
          <Link to="/red-de-ayudas" className="text-primary underline">
            centro de acopio o albergue
          </Link>{' '}
          para llevarles lo que solicitan.
        </p>
        <p className="mt-2 text-fg-muted">
          También puedes ayudar desde una solicitud existente: pulsa{' '}
          <span className="font-medium text-fg">Voy a ayudar</span> en la
          publicación de quien lo necesita. Si puedes transportar la carga, te
          comunicas con la persona que la publicó usando la información de
          contacto de su solicitud. Si ninguno puede transportar, la oferta se
          publica en el{' '}
          <Link to="/transporte" className="text-primary underline">
            Centro de carga
          </Link>{' '}
          para que alguien más la recoja.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-fg">
          3. Abrir un centro de acopio
        </h2>
        <p className="mt-2 text-fg-muted">
          Registra tu organización o centro en{' '}
          <Link to="/nuevo-centro" className="text-primary underline">
            Nuevo centro
          </Link>
          . Publica qué recibes, horarios y ubicación para que la comunidad
          sepa dónde llevar ayuda.
        </p>
        <p className="mt-2 text-fg-muted">
          También puedes registrar una organización que no administras: el
          formulario pregunta si trabajas ahí o solo la agregas para darla a
          conocer.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-fg">4. Coordinar transporte</h2>
        <p className="mt-2 text-fg-muted">
          En el{' '}
          <Link to="/transporte" className="text-primary underline">
            Centro de carga
          </Link>{' '}
          puedes comprometerte a llevar una oferta que necesita transporte, o
          publicar que tienes transporte disponible. Así se conectan las
          donaciones que deben moverse con quienes pueden trasladarlas.
        </p>
      </section>

      <p className="mt-10 text-fg-muted">
        ¿Dudas? Revisa las{' '}
        <Link to="/preguntas-frecuentes" className="text-primary underline">
          Preguntas frecuentes
        </Link>
        .
      </p>
    </article>
  )
}
