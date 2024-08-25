import { TestingAppChain } from "@proto-kit/sdk";
import { Field, method, PrivateKey, PublicKey } from "o1js";
import { Game2048 } from "../../../src/runtime/modules/game2048";
import { log } from "@proto-kit/common";
import { BalancesKey, TokenId, UInt64 } from "@proto-kit/library";
import { Balances } from "../../../src/runtime/modules/balances";
import { Board } from "../../../src/runtime/lib/Board";

type AppChainType = TestingAppChain<
  { Balances: typeof Balances; Game2048: typeof Game2048 },
  any,
  any,
  any
>;

log.setLevel("ERROR");

const TILE_L = [
  [2, [0, 0]],
  [2, [1, 0]],
  [2, [2, 0]],
  [2, [3, 0]],
  [2, [0, 1]],
  [2, [0, 2]],
  [2, [0, 3]],
];

const TESTCASES = [
  {
    name: "Can create new tiles",
    commands: [...TILE_L],
    result: [
      [1, 1, 1, 1],
      [1, 0, 0, 0],
      [1, 0, 0, 0],
      [1, 0, 0, 0],
    ],
    ended: false,
  },
  {
    name: "Move Up",
    commands: [...TILE_L, [1, 0]],
    result: [
      [2, 1, 1, 1],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    ended: false,
  },
  {
    name: "Move Down",
    commands: [...TILE_L, [1, 1]],
    result: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 0],
      [2, 1, 1, 1],
    ],
    ended: false,
  },
  {
    name: "Move Left",
    commands: [...TILE_L, [1, 2]],
    result: [
      [2, 2, 0, 0],
      [1, 0, 0, 0],
      [1, 0, 0, 0],
      [1, 0, 0, 0],
    ],
    ended: false,
  },
  {
    name: "Move Right",
    commands: [...TILE_L, [1, 3]],
    result: [
      [0, 0, 2, 2],
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 1],
    ],
    ended: false,
  },
  {
    name: "Move Up X2",
    commands: [...TILE_L, [1, 0], [1, 0]],
    result: [
      [3, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    ended: false,
  },
  {
    name: "Move Down X2",
    commands: [...TILE_L, [1, 1], [1, 1]],
    result: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [3, 1, 1, 1],
    ],
    ended: false,
  },
  {
    name: "Move Left X2",
    commands: [...TILE_L, [1, 2], [1, 2]],
    result: [
      [3, 0, 0, 0],
      [1, 0, 0, 0],
      [1, 0, 0, 0],
      [1, 0, 0, 0],
    ],
    ended: false,
  },
  {
    name: "Move Right X2",
    commands: [...TILE_L, [1, 3], [1, 3]],
    result: [
      [0, 0, 0, 3],
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 1],
    ],
    ended: false,
  },
];

async function assertBoard(
  appChain: AppChainType,
  player: PublicKey,
  expected: number[][]
) {
  const option = await appChain.query.runtime.Game2048.board.get(player);
  expect(option).toBeDefined();
  const board = new Board(option!);
  expect(board.toArray()).toEqual(expected);
}

describe("Game2048", () => {
  let zkApp: Game2048, appChain: AppChainType, player: PublicKey;

  beforeAll(async () => {
    appChain = TestingAppChain.fromRuntime({
      Balances,
      Game2048,
    }) as any as AppChainType;

    appChain.configurePartial({
      Runtime: {
        Balances: {
          totalSupply: UInt64.from(10000),
        },
        Game2048: {},
      },
    });

    await appChain.start();

    const playerPrivateKey = PrivateKey.random();
    player = playerPrivateKey.toPublicKey();

    appChain.setSigner(playerPrivateKey);

    zkApp = appChain.runtime.resolve("Game2048");
  });

  it("should init board", async () => {
    const tx1 = await appChain.transaction(player, async () => {
      await zkApp.resetGame(player);
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    const board = await appChain.query.runtime.Game2048.board.get(player);
    const maxScore = await appChain.query.runtime.Game2048.maxScore.get(player);
    const gameCount =
      await appChain.query.runtime.Game2048.gameCount.get(player);
    const sessionKey =
      await appChain.query.runtime.Game2048.sessionKey.get(player);

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    expect(board?.toBigInt()).toBe(0n);
    expect(maxScore?.toBigint()).toBe(0n);
    expect(gameCount?.toBigint()).toBe(0n);
    expect(sessionKey?.toBase58()).toBe(player?.toBase58());
  }, 1_000_000);

  for (const TESTCASE of TESTCASES) {
    it(
      TESTCASE.name,
      async () => {
        for (const command of TESTCASE.commands) {
          switch (command[0]) {
            case 1: {
              switch (command[1]) {
                case 0: {
                  const txn = await appChain.transaction(player, async () => {
                    await zkApp.moveUp();
                  });
                  await txn.sign();
                  await txn.send();
                  break;
                }

                case 1: {
                  const txn = await appChain.transaction(player, async () => {
                    await zkApp.moveDown();
                  });
                  await txn.sign();
                  await txn.send();
                  break;
                }

                case 2: {
                  const txn = await appChain.transaction(player, async () => {
                    await zkApp.moveLeft();
                  });
                  await txn.sign();
                  await txn.send();
                  break;
                }

                case 3: {
                  const txn = await appChain.transaction(player, async () => {
                    await zkApp.moveRight();
                  });
                  await txn.sign();
                  await txn.send();
                  break;
                }

                default:
                  throw new Error("Invalid command");
              }
              break;
            }

            case 2: {
              const pos = command[1] as number[];
              const txn = await appChain.transaction(player, async () => {
                await zkApp.addTile(Field(pos[0]), Field(pos[1]));
              });
              await txn.sign();
              await txn.send();

              break;
            }

            default:
              throw new Error("Invalid command");
          }

          await appChain.produceBlock();
        }

        // expect(zkApp.gameDone.get()).toEqual(Bool(TESTCASE.ended))
        assertBoard(appChain, player, TESTCASE.result);

        {
          const txn = await appChain.transaction(player, async () => {
            await zkApp.resetGame(player);
          });
          await txn.sign();
          await txn.send();
        }

        await appChain.produceBlock();
      },
      1_000_000
    );
  }

  // for (const TESTCASE of TESTCASES) {
  //   it(TESTCASE.name + " PARALLEL", async () => {
  //     const txn = await appChain.transaction(player, async () => {
  //       for (const command of TESTCASE.commands) {
  //         switch (command[0]) {
  //           case 1: {
  //             switch (command[1]) {
  //               case 0:
  //                 await zkApp.moveUp();
  //                 break;

  //               case 1:
  //                 await zkApp.moveDown();
  //                 break;

  //               case 2:
  //                 await zkApp.moveLeft();
  //                 break;

  //               case 3:
  //                 await zkApp.moveRight();
  //                 break;
  //             }
  //           }

  //           case 2: {
  //             const pos = command[1] as number[];
  //             await zkApp.addTile(Field(pos[0]), Field(pos[1]));
  //             break;
  //           }
  //         }
  //       }
  //     });
  //     await txn.sign();
  //     await txn.send();

  //     await appChain.produceBlock();

  //     assertBoard(appChain, player, TESTCASE.result);

  //     {
  //       const txn = await appChain.transaction(player, async () => {
  //         await zkApp.resetGame(player);
  //       });
  //       await txn.sign();
  //       await txn.send();
  //     }

  //     await appChain.produceBlock();
  //   });
  // }
});
