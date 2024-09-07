import { DottedKey } from "/src/i18n/keys";

interface CreditEntry {
  label: string;
  link?: string;
}

function label(s: string): CreditEntry {
  return {
    label: s,
  };
}

interface CreditCategory {
  category: DottedKey;
  entries: CreditEntry[];
}

export const credits: CreditCategory[] = [
  {
    category: "credits.realisation",
    entries: [label("Louis Monestier"), label("Pierre Monestier")],
  },
  {
    category: "credits.programming",
    entries: [label("Louis Monestier")],
  },
  {
    category: "credits.graphics",
    entries: [label("Louis Monestier"), label("Pierre Monestier")],
  },
  {
    category: "credits.music",
    entries: [
      {
        label:
          '"Basic Activate.wav" by SirusAmory -- License: Creative Commons 0',
        link: "https://freesound.org/s/460584/",
      },
      {
        label:
          '"Basic Deactivate.wav" by SirusAmory -- License: Creative Commons 0',
        link: "https://freesound.org/s/460583/",
      },
      {
        label:
          '"Ringing a Hand Bell.wav" by Tewkesound -- License: Attribution 4.0',
        link: "https://freesound.org/s/140150/",
      },
      {
        label:
          '"Appearance Effect" by The-Sacha-Rush -- License: Creative Commons 0',
        link: "https://freesound.org/s/472506/",
      },
      {
        label:
          '"Rise of fire" by <a href="https://pixabay.com/users/white_records-32584949/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=217682">Maksym Dudchyk</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=217682">Pixabay</a>',
      },
      label(
        'Laboratory" by <a href="https://pixabay.com/users/amarantamusic-7819462/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=112141">Leonid Timachev</a> from <a href="https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=112141">Pixabay</a>',
      ),
      label(
        '"Epic Battle - Francisco Samuel" by <a href="https://pixabay.com/users/francis_samuel-28842777/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=123469">Francisco Samuel</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=123469">Pixabay</a>',
      ),
    ],
  },
  {
    category: "credits.software",
    entries: [
      label("Audacity"),
      label("Aseprite"),
      label("Krita"),
      label("Phaser 3"),
      label("Sketchbook"),
      label("Webstorm"),
    ],
  },
  {
    category: "credits.thanks",
    entries: [
      label("Adrien"),
      label("Alex"),
      label("Jerôme"),
      label("Matthieu"),
      label("Nancie"),
      label("Virgil"),
      label("Younès"),
    ],
  },
];
