import { FnResponse, FnResponseData, FnResponseError } from "./errors.ts";
import { cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";
import { domain } from "./index.ts";

export async function getSession(): Promise<FnResponse<string>> {
  const response = await fetch(domain);

  const cookieHeader = response.headers.get("set-cookie");

  if (!cookieHeader) {
    return new FnResponseError("No cookie header found");
  }

  const session = cookieHeader.split(";")[0].split("=")[1];

  return new FnResponseData(session);
}

export async function getCountries(): Promise<FnResponse<string[]>> {
  const response = await fetch(domain);
  if (!response.ok) {
    return new FnResponseError(
      `Request failed with status "${response.status}"`
    );
  }

  const html = await response.text();

  const $ = cheerio.load(html);

  const countrySelectSelector = "select[name=uf]";
  const countrySelect = $(countrySelectSelector);

  if (countrySelect.length !== 1) {
    return new FnResponseError(
      `getCountries() - Country select not found. Selector "${countrySelectSelector}" returned ${countrySelect.length} elements.`
    );
  }

  const children = countrySelect.children("option");
  if (children.length === 0) {
    return new FnResponseError(
      `getCountries() - Country select children not found.`
    );
  }
  const countryNames: string[] = [];

  children.each((_, child) => {
    countryNames.push($(child).text());
  });

  if (countryNames.length === 0) {
    return new FnResponseError(`getCountries() - Country names not found.`);
  }

  return new FnResponseData(countryNames);
}

export type GetPlayerData = {
  country: string;
  date: string;
  contract?: string;
  athlete?: string;
  clubCode?: string;
  exercise?: string;
};

export async function getPlayerHtml(
  session: string,
  data: GetPlayerData
): Promise<FnResponse<string>> {
  const formData = new FormData();

  formData.set("uf", data.country);
  formData.set("dt_pesquisa", data.date);
  formData.set("tp_contrato", data.contract || "TODOS");
  formData.set("n_atleta", data.athlete || "");
  formData.set("codigo_clube", data.clubCode || "");
  formData.set("exercicio", data.exercise || "");

  const response = await fetch(`${domain}/a/bid/carregar/json/`, {
    method: "POST",
    body: formData,
    headers: {
      Cookie: `PHPSESSID=${session}`,
    },
  });

  try {
    const json = (await response.json()) as {
      status: "sucesso" | "erro";
      dados: string;
    };

    if (json.status === "erro") {
      const $ = cheerio.load(json.dados);

      return new FnResponseError($("h3").text());
    }

    return new FnResponseData(json.dados);
  } catch (error) {
    return new FnResponseError(
      `getPlayerHtml() - Failed to parse JSON: "${error.message}"`
    );
  }
}
