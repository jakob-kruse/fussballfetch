import { getCountries, getPlayerHtml, getSession } from "./api.ts";
import { FnResponseError } from "./errors.ts";
import { parsePlayers } from "./parser.ts";
import {
  Input,
  Checkbox,
  Confirm,
} from "https://deno.land/x/cliffy/prompt/mod.ts";
import { parse, format } from "https://deno.land/std@0.112.0/datetime/mod.ts";
import add from "https://deno.land/x/date_fns@v2.22.1/add/index.ts";
import sub from "https://deno.land/x/date_fns@v2.22.1/sub/index.js";
import { writeCSVObjects } from "https://deno.land/x/csv/mod.ts";

export const domain = "https://bid.cbf.com.br";
export const dateFormat = "dd/MM/yyyy";

async function promptDate(message: string, defaultValue?: string) {
  const dateString = await Input.prompt({
    message,
    default: defaultValue,
    validate: (dateString) => {
      try {
        parse(dateString, dateFormat);
        return true;
      } catch {
        return "Invalid date. Format: 29.04.2021";
      }
    },
  });

  const date = parse(dateString, dateFormat);

  return date;
}

async function run() {
  const session = await getSession();
  if (session instanceof FnResponseError) {
    return new FnResponseError(
      `getPlayerHtml() - Failed to get session: "${session.error}"`
    );
  }

  console.log(`Loaded session`);

  const countriesResponse = await getCountries();

  if (countriesResponse instanceof FnResponseError) {
    console.error(countriesResponse.error);
    Deno.exit(1);
  }

  let countries = countriesResponse.data;

  console.log(`${countriesResponse.data.length} countries loaded!`);

  const customizeCountries = await Confirm.prompt({
    message: "Customize countries?",
    default: false,
  });

  if (customizeCountries) {
    countries = await Checkbox.prompt({
      message: "Countries",
      options: countriesResponse.data.map((country) => ({
        name: country,
        value: country,
      })),
      keys: {
        next: ["down", "j"],
        previous: ["up", "k"],
      },
      info: true,
      hint: "Press k or j for up and down, space to un/select",
    });
  }

  const startDate = await promptDate(
    "Start Date",
    format(sub(new Date(), { days: 1 }), dateFormat)
  );

  const endDate = await promptDate("End Date", format(new Date(), dateFormat));

  const outFile = await Input.prompt({
    message: "Output file",
    default: "./players.csv",
  });

  const playerGenerator = async function* () {
    for (let date = startDate; date <= endDate; date = add(date, { days: 1 })) {
      for (const country of countries) {
        const dateString = format(date, dateFormat);

        const playerHtmlResult = await getPlayerHtml(session.data, {
          date: dateString,
          country,
        });
        if (playerHtmlResult instanceof FnResponseError) {
          console.error(
            `Failed to fetch players for "${country}" on "${dateString}"`
          );
          console.error(playerHtmlResult.error);

          continue;
        }

        const playerParsingResult = parsePlayers(playerHtmlResult.data);

        if (playerParsingResult instanceof FnResponseError) {
          console.error(
            `Failed to parse players for "${country}" on "${dateString}"`
          );

          continue;
        }

        console.log(
          `[${dateString} ${country} ${countries.indexOf(country) + 1}/${
            countries.length
          }] Found ${playerParsingResult.data.length} player/s`
        );

        for (const player of playerParsingResult.data as Record<
          string,
          string
        >[]) {
          player.country = country;
          yield player;
        }
      }
    }
  };

  const f = await Deno.open(outFile, {
    write: true,
    create: true,
    truncate: true,
  });
  await writeCSVObjects(f, playerGenerator(), {
    header: [
      "country",
      "name",
      "team",
      "id",
      "contractType",
      "startDate",
      "birthday",
      "publicationDate",
    ],
  });

  f.close();

  while (true) {
    if (
      await Confirm.prompt({
        message: "Done! Exit?",
      })
    ) {
      Deno.exit(0);
    }
  }
}

run();
