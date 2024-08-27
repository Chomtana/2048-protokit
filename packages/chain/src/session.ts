import express, { Request, Response } from 'express';
import { buildAppChain } from "./environments/client.config.js";
import { Field, PrivateKey } from 'o1js';
import { InMemorySigner } from "@proto-kit/sdk";

type Action = { type: 'move', player: string, dir: string } | { type: 'addTile', player: string, r: number, c: number }

const app = express();
const port = process.env.PORT || 3300;

const SESSION_KEY_MAP: {[player: string]: PrivateKey} = {}
const SESSION_KEY_CLIENT: {[player: string]: ReturnType<typeof buildAppChain>} = {}

const ACTIONS: Action[] = []

app.get('/session-key/:address', async (req: Request, res: Response) => {
  try {
    if (!SESSION_KEY_MAP[req.params.address]) {
      const pk = PrivateKey.random()
      const client = buildAppChain(InMemorySigner)
  
      await client.start()
  
      client.resolveOrFail('Signer', InMemorySigner).config.signer = pk
  
      SESSION_KEY_MAP[req.params.address] = pk
      SESSION_KEY_CLIENT[req.params.address] = client
    }
  
    res.send({
      address: SESSION_KEY_MAP[req.params.address].toPublicKey().toBase58()
    });
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
});

app.get('/move/:address', async (req: Request, res: Response) => {
  if (!req.query.dir) return res.sendStatus(400)

  try {
    ACTIONS.push({
      type: 'move',
      player: req.params.address,
      dir: req.query.dir as string,
    })

    res.send({ success: 'true' })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.get('/add-tile/:address', async (req: Request, res: Response) => {
  if (!req.query.r || !req.query.c) return res.sendStatus(400)

  try {
    ACTIONS.push({
      type: 'addTile',
      player: req.params.address,
      r: parseInt(req.query.r as string),
      c: parseInt(req.query.c as string),
    })

    res.send({ success: 'true' })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.get('/self-reset/:address', async (req: Request, res: Response) => {
  try {
    const client = SESSION_KEY_CLIENT[req.params.address]
    const pk = SESSION_KEY_MAP[req.params.address]
    const pub = pk.toPublicKey()

    const game2048 = client.runtime.resolve("Game2048");

    const txn = await client.transaction(pub, async () => {
      await game2048.resetGame(pub);
    });
    await txn.sign();
    await txn.send();

    res.send({ success: 'true' })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

async function processAction() {
  const action = ACTIONS.shift()

  if (action) {
    try {
      const client = SESSION_KEY_CLIENT[action.player]
      const pk = SESSION_KEY_MAP[action.player]
      const pub = pk.toPublicKey()
  
      const game2048 = client.runtime.resolve("Game2048");
  
      if (action.type == 'addTile') {
        const txn = await client.transaction(pub, async () => {
          await game2048.addTile(Field(action.r), Field(action.c));
        });
        await txn.sign();
        await txn.send();
      } else if (action.type == 'move') {
        const dir = action.dir
  
        switch (dir) {
          case 'u': {
            const txn = await client.transaction(pub, async () => {
              await game2048.moveUp();
            });
            await txn.sign();
            await txn.send();
            break;
          }
    
          case 'd': {
            const txn = await client.transaction(pub, async () => {
              await game2048.moveDown();
            });
            await txn.sign();
            await txn.send();
            break;
          }
    
          case 'l': {
            const txn = await client.transaction(pub, async () => {
              await game2048.moveLeft();
            });
            await txn.sign();
            await txn.send();
            break;
          }
    
          case 'r': {
            const txn = await client.transaction(pub, async () => {
              await game2048.moveRight();
            });
            await txn.sign();
            await txn.send();
            break;
          }
        }
      }
    } catch (err) {
      console.error(err)
    }
  }
}

setInterval(processAction, 1100)

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, world!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // You can log the error and decide what to do next:
  // For example, restart the process, notify developers, etc.
});