"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

type Language = "en" | "de" | "it" | "fr" | "sl";

interface Translation {
  title: string;
  body: string;
  institutes: {
    title: string;
    description: string;
    url: string;
  }[];
  buttonExplore: string;
  buttonLearnMore: string;
  buttonContinue: string;
  checkboxLabel: string;
}

const translations: Record<Language, Translation> = {
  en: {
    title:
      "Understanding droughts in the Alps — to protect our mountain ecosystems and communities.",
    body: "The Alpine Drought Observatory helps us track and understand droughts in the Alpine region — a growing threat to biodiversity, water resources and livelihoods. Using satellite observations, ground-station and hydrological data, our scientists turn complex information into actionable insights for mountain communities and decision-makers.",
    institutes: [
      {
        title: "Institute for Earth Observation",
        description: "Monitoring environmental changes in mountain regions to understand how our planet is evolving — and how to protect it.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-earth-observation"
      },
      {
        title: "Institute for Alpine Environment",
        description: "Studying Alpine ecosystems and developing solutions for sustainable management of natural resources in mountain regions.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-alpine-environment"
      },
      {
        title: "Center for Climate Change and Transformation",
        description: "Researching climate change impacts and supporting communities in adapting to environmental challenges.",
        url: "https://www.eurac.edu/en/institutes-centers/center-for-climate-change-and-transformation"
      }
    ],
    buttonExplore: "Start Exploring",
    buttonLearnMore: "Learn more",
    buttonContinue: "Continue to Data",
    checkboxLabel: "Don't show again",
  },
  de: {
    title:
      "Dürre verstehen, um alpine Ökosysteme und Gemeinschaften zu schützen.",
    body: "Das Alpine Drought Observatory hilft uns, Dürre im Alpenraum zu erfassen und zu verstehen – eine wachsende Bedrohung für Biodiversität, Wasserressourcen und Lebensgrundlagen. Mithilfe von Satellitendaten, Messstationen und hydrologischen Daten übersetzen unsere Forschenden komplexe Informationen in konkrete Erkenntnisse für Bergregionen und Entscheidungsträger.",
    institutes: [
      {
        title: "Institut für Erdbeobachtung",
        description: "Beobachtung von Umweltveränderungen in Gebirgsregionen, um besser zu verstehen, wie sich unser Planet verändert — und wie wir ihn schützen können.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-earth-observation"
      },
      {
        title: "Institut für Alpine Umwelt",
        description: "Erforschung alpiner Ökosysteme und Entwicklung von Lösungen für ein nachhaltiges Management natürlicher Ressourcen in Bergregionen.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-alpine-environment"
      },
      {
        title: "Center for Climate Change and Transformation",
        description: "Untersuchung der Auswirkungen des Klimawandels und Unterstützung von Gemeinschaften bei der Anpassung an Umweltherausforderungen.",
        url: "https://www.eurac.edu/en/institutes-centers/center-for-climate-change-and-transformation"
      }
    ],
    buttonExplore: "Jetzt erkunden",
    buttonLearnMore: "Mehr erfahren",
    buttonContinue: "Weiter zu den Daten",
    checkboxLabel: "Nicht mehr anzeigen",
  },
  it: {
    title:
      "Capire la siccità per proteggere ecosistemi e comunità alpine.",
    body: "L'Osservatorio sulla Siccità Alpina ci aiuta a monitorare e comprendere la siccità nelle Alpi — una minaccia crescente per la biodiversità, le risorse idriche e le comunità. Utilizzando dati satellitari, stazioni di misura e dati idrologici, i nostri ricercatori trasformano informazioni complesse in conoscenze concrete per le regioni montane e i decisori.",
    institutes: [
      {
        title: "Istituto per l'Osservazione della Terra",
        description: "Monitoraggio dei cambiamenti ambientali nelle regioni montane per comprendere meglio come si evolve il nostro pianeta e come possiamo proteggerlo.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-earth-observation"
      },
      {
        title: "Istituto per l'Ambiente Alpino",
        description: "Studio degli ecosistemi alpini e sviluppo di soluzioni per una gestione sostenibile delle risorse naturali nelle regioni montane.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-alpine-environment"
      },
      {
        title: "Center for Climate Change and Transformation",
        description: "Ricerca sugli impatti dei cambiamenti climatici e supporto alle comunità nell'adattamento alle sfide ambientali.",
        url: "https://www.eurac.edu/en/institutes-centers/center-for-climate-change-and-transformation"
      }
    ],
    buttonExplore: "Inizia l'esplorazione",
    buttonLearnMore: "Scopri di più",
    buttonContinue: "Continua ai dati",
    checkboxLabel: "Non mostrare più",
  },
  fr: {
    title:
      "Comprendre les sécheresses dans les Alpes — pour protéger nos écosystèmes et communautés de montagne.",
    body: "L'Observatoire Alpin de la Sécheresse nous aide à suivre et comprendre les sécheresses dans la région alpine — une menace croissante pour la biodiversité, les ressources en eau et les moyens de subsistance. En utilisant des observations satellitaires, des données de stations au sol et hydrologiques, nos scientifiques transforment des informations complexes en perspectives concrètes pour les communautés de montagne et les décideurs.",
    institutes: [
      {
        title: "Institut d'Observation de la Terre",
        description: "Surveillance des changements environnementaux dans les régions montagneuses pour comprendre l'évolution de notre planète et comment la protéger.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-earth-observation"
      },
      {
        title: "Institut pour l'Environnement Alpin",
        description: "Étude des écosystèmes alpins et développement de solutions pour une gestion durable des ressources naturelles dans les régions montagneuses.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-alpine-environment"
      },
      {
        title: "Centre pour le Changement Climatique et la Transformation",
        description: "Recherche sur les impacts du changement climatique et soutien aux communautés dans leur adaptation aux défis environnementaux.",
        url: "https://www.eurac.edu/en/institutes-centers/center-for-climate-change-and-transformation"
      }
    ],
    buttonExplore: "Commencer l'exploration",
    buttonLearnMore: "En savoir plus",
    buttonContinue: "Continuer vers les données",
    checkboxLabel: "Ne plus afficher",
  },
  sl: {
    title:
      "Razumevanje suš v Alpah — za zaščito gorskih ekosistemov in skupnosti.",
    body: "Alpski observatorij za sušo nam pomaga spremljati in razumeti suše v alpski regiji — naraščajočo grožnjo biotski raznovrstnosti, vodnim virom in preživetju. Z uporabo satelitskih opazovanj, podatkovземeljskih postaj in hidroloških podatkov naši znanstveniki pretvarjajo kompleksne informacije v uporabne vpoglede za gorske skupnosti in odločevalce.",
    institutes: [
      {
        title: "Inštitut za opazovanje Zemlje",
        description: "Spremljamo okoljske spremembe v gorskih regijah, da bi razumeli, kako se naš planet razvija in kako ga zaščititi.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-earth-observation"
      },
      {
        title: "Inštitut za alpsko okolje",
        description: "Preučujemo alpske ekosisteme in razvijamo rešitve za trajnostno upravljanje naravnih virov v gorskih regijah.",
        url: "https://www.eurac.edu/en/institutes-centers/institute-for-alpine-environment"
      },
      {
        title: "Center za podnebne spremembe in preobrazbo",
        description: "Raziskujemo vplive podnebnih sprememb in podpiramo skupnosti pri prilagajanju okoljskim izzivom.",
        url: "https://www.eurac.edu/en/institutes-centers/center-for-climate-change-and-transformation"
      }
    ],
    buttonExplore: "Začni raziskovati",
    buttonLearnMore: "Več informacij",
    buttonContinue: "Nadaljuj na podatke",
    checkboxLabel: "Ne prikaži več",
  },
};

const detectLanguage = (): Language => {
  if (typeof window === "undefined") return "en";

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith("de")) return "de";
  if (browserLang.startsWith("it")) return "it";
  if (browserLang.startsWith("fr")) return "fr";
  if (browserLang.startsWith("sl")) return "sl";
  return "en";
};

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  const t = translations[language];

  useEffect(() => {
    setMounted(true);
    setLanguage(detectLanguage());
    const dismissed = localStorage.getItem("adoModalDismissed");
    if (!dismissed) {
      // Delay opening until after hydration is complete to avoid aria-hidden mismatch
      setTimeout(() => setIsOpen(true), 100);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("adoModalDismissed", "true");
    }
    setIsOpen(false);
  };

  const handleExplore = () => {
    handleClose();
    // Navigate to main observatory page if needed
  };

  const handleLearnMore = () => {
    window.open("https://www.eurac.edu/en/institutes-centers/institute-for-earth-observation", "_blank");
  };

  if (!mounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="bg-gradient-to-br from-neutral-900 to-neutral-950 backdrop-blur-xl border border-neutral-800/50 text-neutral-100 rounded-3xl shadow-2xl max-w-4xl max-h-[90vh] overflow-y-auto p-0 transition-all duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 [&>button]:hidden z-50"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-6 md:space-y-8 p-6 md:p-8 lg:p-12">
          {/* Header with Logo and Language Selector */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="178.793"
              height="22"
              viewBox="0 0 178.793 19.536"
              className="h-4 md:h-5 w-auto opacity-80"
            >
              <g fill="#e5e5e5">
                <path d="M165.199 19.215c.679-.027 1.709-.081 2.768-.081 1.031 0 2.144.054 2.822.081v-.76l-.9-.135c-.6-.109-.9-.272-.9-2.171V8.303a6.188 6.188 0 0 1 3.147-1.058c2.307 0 2.849 1.275 2.849 3.337v5.562c0 1.9-.271 2.062-.9 2.171l-.9.135v.765c.678-.027 1.709-.081 2.767-.081 1.031 0 2.144.054 2.822.081v-.76l-.9-.135c-.6-.109-.9-.272-.9-2.171v-5.866c0-2.74-.923-4.639-4.124-4.639a6.3 6.3 0 0 0-3.88 1.763V0a20.047 20.047 0 0 1-3.771 1.465v.65c1.763.352 1.763.678 1.763 2.062v11.967c0 1.9-.271 2.062-.9 2.171l-.9.135zm-6.539.326a4.838 4.838 0 0 0 4.016-1.737l-.136-.705a5.725 5.725 0 0 1-3.147.841c-2.822 0-4.8-1.927-4.8-5.4 0-3.608 1.927-5.725 4.232-5.725 1.927 0 2.551 1.031 2.632 2.577h1.031c0-.9.027-2.2.109-3.093a10.729 10.729 0 0 0-3.608-.651c-3.555 0-6.513 3.12-6.513 7.163 0 4.124 2.306 6.729 6.186 6.729zm-16.037-.325c.678-.027 1.709-.109 2.767-.109 1.031 0 2.5.082 3.175.109v-.76l-1.247-.14c-.6-.082-.9-.272-.9-2.171V8.466a4.73 4.73 0 0 1 2.879-1.031 4.092 4.092 0 0 1 1.493.244l.218-1.872a4.463 4.463 0 0 0-1.167-.163 5.094 5.094 0 0 0-3.419 1.9V5.508a26.914 26.914 0 0 1-3.771 1.3v.651c1.764.352 1.764.678 1.764 2.062v6.62c0 1.9-.272 2.062-.9 2.171l-.9.135zm-9.415-1.248a2.045 2.045 0 0 1-2.225-2.152c0-1.655 1.248-2.659 4.042-2.659.3 0 .761 0 1.059.028-.027.569-.081 2.6-.081 3.581a3.744 3.744 0 0 1-2.795 1.194m-.732 1.574a4.534 4.534 0 0 0 3.608-1.845h.055a1.777 1.777 0 0 0 1.98 1.845 4.134 4.134 0 0 0 2.063-.489v-.76c-1.656 0-2.144-.379-2.144-1.709 0-2.442.109-4.5.109-6.62 0-2.632-1.52-4.314-4.586-4.314a5.427 5.427 0 0 0-3.717 1.546l.136.787a6.281 6.281 0 0 1 3.094-.732c2.116 0 3.039 1.112 3.039 3.2v1.578c-.407-.027-1.086-.027-1.466-.027-3.473 0-5.725 1.628-5.725 4.178a3.316 3.316 0 0 0 3.555 3.365m-14.19-8.846c.217-1.845 1.356-3.852 3.636-3.852a2.977 2.977 0 0 1 2.846 3.256c0 .379-.162.6-.624.6zm3.88 8.846c1.953 0 3.663-.842 4.178-1.683l-.081-.678a7.9 7.9 0 0 1-3.581.76c-3.039 0-4.5-2.442-4.5-5.372 0-.245 0-.516.027-.786h8.764a5.816 5.816 0 0 0 .055-.977 4.832 4.832 0 0 0-4.993-5.155c-3.527 0-6 3.039-6 7.163 0 4.151 2.144 6.729 6.133 6.729zm-13.648 0c2.713 0 4.694-1.818 4.694-3.989 0-4.857-6.838-3.554-6.838-6.7 0-1.383 1.059-2.089 2.687-2.089 1.818 0 2.632.9 2.767 2.632h1a22.693 22.693 0 0 1-.054-3.039 10.491 10.491 0 0 0-3.609-.705c-2.632 0-4.585 1.411-4.585 3.581 0 4.911 6.81 3.256 6.81 6.648 0 1.519-1.194 2.469-2.9 2.469-2.307 0-2.876-1.058-3.12-2.985h-1a31.179 31.179 0 0 1 .074 3.555 12.844 12.844 0 0 0 4.07.624m-15.38-8.849c.217-1.845 1.357-3.852 3.636-3.852a2.978 2.978 0 0 1 2.845 3.256c0 .379-.163.6-.624.6zm3.88 8.846c1.954 0 3.663-.842 4.179-1.683l-.082-.678a7.9 7.9 0 0 1-3.581.76c-3.038 0-4.5-2.442-4.5-5.372 0-.245 0-.516.027-.786h8.764a5.931 5.931 0 0 0 .054-.977 4.832 4.832 0 0 0-4.992-5.155c-3.528 0-6 3.039-6 7.163 0 4.151 2.144 6.729 6.132 6.729m-15.986-.322c.678-.027 1.709-.109 2.767-.109 1.032 0 2.5.082 3.175.109v-.76l-1.248-.14c-.6-.082-.9-.272-.9-2.171V8.466a4.728 4.728 0 0 1 2.881-1.031 4.091 4.091 0 0 1 1.492.244l.218-1.872a4.458 4.458 0 0 0-1.167-.163 5.091 5.091 0 0 0-3.419 1.9V5.508a26.95 26.95 0 0 1-3.772 1.3v.651c1.764.352 1.764.678 1.764 2.062v6.62c0 1.9-.272 2.062-.9 2.171l-.9.135zM67.738 19.536a10.166 10.166 0 0 0 3.687-.663v-4.032a5.963 5.963 0 0 1-3.283.778c-1.7 0-2.707-1.152-2.707-3.283 0-2.592 1.094-3.629 2.679-3.629a8.352 8.352 0 0 1 3.082.6V5.366a12.034 12.034 0 0 0-3.573-.518c-5.011 0-7.6 3.2-7.6 7.488 0 4.464 2.362 7.2 7.719 7.2M50.66 16.048c-.806 0-1.325-.259-1.325-1.066 0-.95.518-1.325 1.959-1.325a5.282 5.282 0 0 1 .633.029V15.5a1.742 1.742 0 0 1-1.267.547m-1.76 3.489a4.211 4.211 0 0 0 3.718-1.788 3.347 3.347 0 0 0 3.37 1.786 4.056 4.056 0 0 0 2.391-.576v-3.2a2.9 2.9 0 0 1-.462.058c-.576 0-.806-.346-.806-1.009v-4.43c0-3.772-1.872-5.529-6.48-5.529a14.844 14.844 0 0 0-4.751.72v3.83a14.846 14.846 0 0 1 3.859-.6c1.556 0 2.189.547 2.189 1.728v.461c-.2 0-.433-.029-.921-.029-3.888 0-6.711 1.095-6.711 4.349 0 2.966 2.045 4.233 4.609 4.233m-15.525-.234h5.184v-9.274a7.4 7.4 0 0 1 3.11-.72 6.513 6.513 0 0 1 1.584.173V4.992a3.481 3.481 0 0 0-1.152-.144 4.839 4.839 0 0 0-3.657 1.728V5.078H33.38zm-12.3.231a6.047 6.047 0 0 0 3.888-1.354v1.123h5.04V5.078h-5.182v9.706a3.025 3.025 0 0 1-1.728.748c-1.037 0-1.555-.461-1.555-1.757V5.078H16.33v9.476c0 2.851 1.239 4.982 4.752 4.982M5.414 10.548c.058-1.009.49-2.045 1.728-2.045 1.095 0 1.555.95 1.555 1.872v.173zm2.42 8.986a13.961 13.961 0 0 0 4.838-.806v-3.829a11.914 11.914 0 0 1-4.406.864c-2.3 0-2.852-.864-2.938-2.419h8.324a13.521 13.521 0 0 0 .086-1.527c0-3.657-1.584-6.969-6.624-6.969C2.275 4.848 0 8.39 0 12.163c0 4.32 2.16 7.373 7.834 7.373"></path>
              </g>
            </svg>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
                {(["en", "de", "it", "fr", "sl"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-xs font-medium rounded-md transition-all ${language === lang
                      ? "bg-neutral-700 text-neutral-50"
                      : "text-neutral-400 hover:text-neutral-200"
                      }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="rounded-full p-1.5 sm:p-2 bg-neutral-800/50 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>

          {/* Hero Title */}
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-light leading-tight text-neutral-50 tracking-tight">
              {t.title}
            </DialogTitle>
          </DialogHeader>

          {/* Body Text */}
          <p className="text-neutral-300 leading-relaxed text-base md:text-lg">
            {t.body}
          </p>

          {/* Institute Cards */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-medium text-neutral-400 uppercase tracking-wide">
              Eurac Research Institutes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3">
              {t.institutes.map((institute, index) => (
                <a
                  key={index}
                  href={institute.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="bg-gradient-to-br from-neutral-800/60 to-neutral-900/60 border-neutral-700/50 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:bg-neutral-800/80 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-900/10 cursor-pointer h-full">
                    <div className="space-y-1.5 sm:space-y-2">
                      <h4 className="font-semibold text-neutral-50 text-xs sm:text-sm leading-tight">
                        {institute.title}
                      </h4>
                      <p className="text-neutral-400 text-[11px] sm:text-xs leading-relaxed">
                        {institute.description}
                      </p>
                      <span className="inline-flex items-center text-[10px] sm:text-xs text-blue-400 transition-colors underline underline-offset-2">
                        {t.buttonLearnMore}
                      </span>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleExplore}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-fit transition-all shadow-lg shadow-blue-900/20 h-11 sm:h-12 text-sm sm:text-base font-medium"
          >
            {t.buttonExplore}
          </Button>

          {/* Don't Show Again Checkbox */}
          <div className="flex items-center space-x-3 pt-4 border-t border-neutral-800/50">
            <Checkbox
              id="dontShow"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              className="border-neutral-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <label
              htmlFor="dontShow"
              className="text-sm text-neutral-400 cursor-pointer select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t.checkboxLabel}
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
