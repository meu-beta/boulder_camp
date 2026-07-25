import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-cover bg-center relative overflow-hidden"
      style={{ backgroundImage: "url('https://meu-beta.web.app/assets/bc.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="absolute top-6 left-6 z-10">
        <img
          src="https://meu-beta.web.app/assets/horizontal_logo.png"
          alt="Meu Beta"
          className="h-8"
        />
      </div>

      <Link
        to="/comp"
        className="absolute top-6 right-6 z-10 bg-gold text-panel font-bold px-4 py-2 rounded-lg shadow-lg hover:opacity-90 transition text-sm sm:text-base"
      >
        Meu Beta Comp
      </Link>

      <div className="relative z-10 flex flex-col items-center text-center">
        <img
          src="https://meu-beta.web.app/assets/vertical_logo.png"
          alt="Meu Beta"
          className="w-48 sm:w-56 rounded-3xl shadow-2xl mb-8"
        />
        <p className="text-white/80 text-lg sm:text-xl max-w-md mb-10">
          O app da comunidade da escalada
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a
            href="https://apps.apple.com/br/app/meu-beta/id6740679990"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://meu-beta.web.app/assets/appstore.png"
              alt="Disponível na App Store"
              className="h-14"
            />
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.meubeta.app.meubeta"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://meu-beta.web.app/assets/googleplay.png"
              alt="Disponível no Google Play"
              className="h-14"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
