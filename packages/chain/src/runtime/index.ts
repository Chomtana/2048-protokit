import { Balance, VanillaRuntimeModules } from "@proto-kit/library";
import { ModulesConfig } from "@proto-kit/common";

import { Balances } from "./modules/balances";
import { Game2048 } from "./modules/game2048";

export const modules = VanillaRuntimeModules.with({
  Balances,
  Game2048,
});

export const config: ModulesConfig<typeof modules> = {
  Balances: {
    totalSupply: Balance.from(10_000),
  },
  Game2048: {},
};

export default {
  modules,
  config,
};
