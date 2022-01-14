import { FnResponseData } from "./errors.ts";
import { cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";

export type Player = {
  name: string | null;
  startDate: string | null;
  id: string | null;
  contractType: string | null;
  team: string | null;
  birthday: string | null;
  publicationDate: string | null;
};

export function parsePlayers(playersHtml: string) {
  const $ = cheerio.load(playersHtml);

  const players = $(".modal-dialog").map((_, playerElement) => {
    const player: Partial<Player> = {
      name: $(playerElement).find("h4").text().trim(),
      team: $(playerElement).find(".col-xs-9.col-sm-9.col-md-9").text().trim(),
    };

    const playerAttributes = $(playerElement).find(".modal-body").find("p");

    playerAttributes.each((_, playerAttribute) => {
      let [name, info] = $(playerAttribute).text().split(":");
      if (!name || !info) {
        return null;
      }

      name = name.trim();
      info = info.trim();

      switch (name) {
        case "Inscrição":
          player.id = info ?? null;
          break;
        case "Tipo Contrato":
          player.contractType = info.split("N°")[0].trim() ?? null;
          break;
        case "Data inicio":
          player.startDate = info ?? null;
          break;
        case "Nascimento":
          player.birthday = info ?? null;
          break;
        case "Data de Publicação":
          player.publicationDate = info.split(" ")[0] ?? null;
          break;
      }
    });

    return player;
  });

  return new FnResponseData(players.toArray() as unknown as Player[]);
}
