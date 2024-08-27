import { create } from "zustand";
import { Client, useClientStore } from "./client";
import { immer } from "zustand/middleware/immer";
import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";
import { Balance, BalancesKey, TokenId } from "@proto-kit/library";
import { PublicKey, UInt64 } from "o1js";
import { useCallback, useEffect } from "react";
import { useChainStore } from "./chain";
import { useWalletStore } from "./wallet";

export interface BalancesState {
  loading: boolean;
  balances: {
    // address - balance
    [key: string]: string;
  };
  loadBalance: (client: Client, address: string) => Promise<void>;
  faucet: (client: Client, address: string) => Promise<PendingTransaction>;
}

function isPendingTransaction(
  transaction: PendingTransaction | UnsignedTransaction | undefined,
): asserts transaction is PendingTransaction {
  if (!(transaction instanceof PendingTransaction))
    throw new Error("Transaction is not a PendingTransaction");
}

export const tokenId = TokenId.from(0);

export const useBalancesStore = create<
  BalancesState,
  [["zustand/immer", never]]
>(
  immer((set) => ({
    loading: Boolean(false),
    balances: {},
    async loadBalance(client: Client, address: string) {
      set((state) => {
        state.loading = true;
      });

      const key = BalancesKey.from(tokenId, PublicKey.fromBase58(address));

      const balance = await client.query.runtime.Balances.balances.get(key);

      set((state) => {
        state.loading = false;
        state.balances[address] = balance?.toString() ?? "0";
      });
    },
    async faucet(client: Client, address: string) {
      const balances = client.runtime.resolve("Balances");
      const sender = PublicKey.fromBase58(address);

      const tx = await client.transaction(sender, async () => {
        await balances.addBalance(tokenId, sender, Balance.from(1000));
      });

      await tx.sign();
      await tx.send();

      isPendingTransaction(tx.transaction);
      return tx.transaction;
    },
  })),
);

export const useObserveBalance = () => {
  const client = useClientStore();
  const chain = useChainStore();
  const wallet = useWalletStore();
  const balances = useBalancesStore();

  useEffect(() => {
    if (!client.client || !wallet.wallet) return;

    balances.loadBalance(client.client, wallet.wallet);
  }, [client.client, chain.block?.height, wallet.wallet]);
};


/// // / // / / 

export interface Game2048State {
  resetGame: (client: Client, address: string, sessionKey: string) => Promise<PendingTransaction>;
  // moveUp: (client: Client, address: string) => Promise<PendingTransaction>;
  // moveDown: (client: Client, address: string) => Promise<PendingTransaction>;
  // moveLeft: (client: Client, address: string) => Promise<PendingTransaction>;
  // moveRight: (client: Client, address: string) => Promise<PendingTransaction>;
}

export const useGame2048Store = create<
  Game2048State,
  [["zustand/immer", never]]
>(
  immer((set) => ({
    async resetGame(client: Client, address: string, sessionKey: string) {
      const game2048 = client.runtime.resolve("Game2048");
      const sender = PublicKey.fromBase58(address);
      const sessionPublicKey = PublicKey.fromBase58(sessionKey);

      const tx = await client.transaction(sender, async () => {
        await game2048.resetGame(sessionPublicKey);
      });

      await tx.sign();
      await tx.send();

      isPendingTransaction(tx.transaction);
      return tx.transaction;
    },
  })),
);

export const useResetGame = () => {
  const client = useClientStore();
  const game2048 = useGame2048Store();
  const wallet = useWalletStore();

  return useCallback(async (sessionKey?: string) => {
    if (!client.client || !wallet.wallet) return;

    const pendingTransaction = await game2048.resetGame(
      client.client,
      wallet.wallet,
      sessionKey ?? wallet.wallet,
    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};
