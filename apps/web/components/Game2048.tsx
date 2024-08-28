"use client";
import React, { FC, useCallback, useEffect, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import Box from './Box';
import Control from './Control/Control';
import GameBoard from './GameBoard';
import ScoreBoard from './ScoreBoard';
import Switch from './Switch';
import Text from './Text';
import useGameBoard from '../hooks/useGameBoard';
import useGameScore from '../hooks/useGameScore';
import useGameState, { GameStatus } from '../hooks/useGameState';
import useScaleControl from '../hooks/useScaleControl';
import { GRID_SIZE, MIN_SCALE, SPACING } from '../utils/constants';
import useLocalStorage from '../hooks/useLocalStorage';
import { ThemeName } from '../themes/types';
import useTheme from '../hooks/useTheme';
import { canGameContinue, isWin } from '../utils/rules';
import { useResetGame } from '@/lib/stores/game';
import Button from './Button';
import logo2048 from "@/public/2048_logo.svg";
import Image from "next/image";
import axios from "axios"
import { useWalletStore } from '@/lib/stores/wallet';

export type Configuration = {
  theme: ThemeName;
  bestScore: number;
  rows: number;
  cols: number;
};

const APP_NAME = 'react-2048';

const Game2048: FC = () => {
  const resetGame = useResetGame()

  const [gameInitialized, setGameInitialized] = useState(false)
  const [gameInitializing, setGameInitializing] = useState(false)

  const wallet = useWalletStore()

  const [gameState, setGameStatus] = useGameState({
    status: 'running',
    pause: false,
  });

  const [config, setConfig] = useLocalStorage<Configuration>(APP_NAME, {
    theme: 'default',
    bestScore: 0,
    rows: MIN_SCALE,
    cols: MIN_SCALE,
  });

  const [{ name: themeName, value: themeValue }, setTheme] = useTheme(
    config.theme,
  );

  const [rows, setRows] = useScaleControl(config.rows);
  const [cols, setCols] = useScaleControl(config.cols);

  const { total, best, addScore, setTotal } = useGameScore(config.bestScore);

  const { tiles, grid, onMove, onMovePending, onMergePending } = useGameBoard({
    rows,
    cols,
    gameState,
    addScore,
    initialized: gameInitialized,
  });

  const onResetGame = useCallback(async () => {
    try {
      setGameInitializing(true)

      const response = await axios.get(`${process.env.NEXT_PUBLIC_SESSION_SERVER_URL}/session-key/${wallet.wallet}`)
      await resetGame(response.data.address)

      setGameStatus('restart');
      setGameInitialized(true)
    } catch (err) {
      console.error(err)
    } finally {
      setGameInitializing(false)
    }
  }, [setGameStatus]);

  const onCloseNotification = useCallback(
    (currentStatus: GameStatus) => {
      setGameStatus(currentStatus === 'win' ? 'continue' : 'restart');
    },
    [setGameStatus],
  );

  if (gameState.status === 'restart') {
    setTotal(0);
    setGameStatus('running');
  } else if (gameState.status === 'running' && isWin(tiles)) {
    setGameStatus('win');
  } else if (gameState.status !== 'lost' && !canGameContinue(grid, tiles)) {
    setGameStatus('lost');
  }

  useEffect(() => {
    setGameStatus('restart');
  }, [rows, cols, setGameStatus]);

  useEffect(() => {
    setConfig({ rows, cols, bestScore: best, theme: themeName });
  }, [rows, cols, best, themeName, setConfig]);

  return (
    <ThemeProvider theme={themeValue}>
      <Box
        justifyContent="center"
        inlineSize="100%"
        blockSize="100%"
        alignItems="start"
        borderRadius={0}
      >
        <Box
          justifyContent="center"
          flexDirection="column"
          inlineSize={`${GRID_SIZE}px`}
        >
          {/* <Box marginBlockStart="s6" inlineSize="100%" justifyContent="end">
            <Switch
              title="dark mode"
              checked={themeName === 'dark'}
              activeValue="dark"
              inactiveValue="default"
              onChange={setTheme}
            />
          </Box> */}
          <Box
            inlineSize="100%"
            justifyContent="center"
            marginBlockStart="s2"
          >
            <Box>
              <Text fontSize={64} fontWeight="bold" color="primary">
                Mina 2048
              </Text>
            </Box>
          </Box>

          <Box
            inlineSize="100%"
            justifyContent="space-between"
            marginBlockStart="s2"
            marginBlockEnd="s6"
          >
            <Box>
              <Button onClick={onResetGame} disable={gameInitializing}>
                <Text fontSize={16} textTransform="capitalize">
                  {gameInitializing ? 'Processing...' : 'New Game'}
                </Text>
              </Button>
            </Box>

            <Box justifyContent="center">
              <ScoreBoard total={total} title="score" />
              <ScoreBoard total={best} title="best" />
            </Box>
          </Box>
          {/* <Box marginBlockStart="s2" marginBlockEnd="s6" inlineSize="100%">
            <Control
              rows={rows}
              cols={cols}
              onReset={onResetGame}
              onChangeRow={setRows}
              onChangeCol={setCols}
            />
          </Box> */}
          <div style={{ position: 'relative' }}>
            <GameBoard
              tiles={tiles}
              boardSize={GRID_SIZE}
              rows={rows}
              cols={cols}
              spacing={SPACING}
              gameStatus={gameState.status}
              onMove={onMove}
              onMovePending={onMovePending}
              onMergePending={onMergePending}
              onCloseNotification={onCloseNotification}
            />

            {!gameInitialized &&
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#FFFFFFAA'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <div>
                    <Image className="h-24 w-24 mb-5" src={logo2048} alt={"2048 logo"} />
                  </div>

                  <Button onClick={onResetGame} disable={gameInitializing}>
                    <Text fontSize={16} textTransform="capitalize">
                      {gameInitializing ? 'Processing...' : 'New Game'}
                    </Text>
                  </Button>
                </div>
              </div>
            }
          </div>
          {/* <Box marginBlock="s4" justifyContent="center" flexDirection="column">
            <Text fontSize={16} as="p" color="primary">
              ✨ Join tiles with the same value to get 2048
            </Text>
            <Text fontSize={16} as="p" color="primary">
              🕹️ Play with arrow keys or swipe
            </Text>
          </Box> */}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Game2048;
