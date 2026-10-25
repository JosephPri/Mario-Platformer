//Joseph Priatel
//Programming 12

import ddf.minim.*;
import ddf.minim.analysis.*;
import ddf.minim.effects.*;
import ddf.minim.signals.*;
import ddf.minim.spi.*;
import ddf.minim.ugens.*;

import fisica.*;
FWorld world;
FPlayer player;
FBox borderL;
FBox borderR;

color black = #000000;
color white = #FFFFFF;
color leafGreen = #6ABB4A;
color grassGreen = #2E6115;
color waterBlue = #056DB1;
color iceBlue = #31A2EE;
color trunkBrown = #964D00;
color dirtBrown = #B25A00;
color bridgeBrown = #D87C19;
color fenceBrown = #F6B233;
color stoneGrey = #9B9B9B;
color spikeGrey = #777777;
color lavaRed = #B90000;
color trampolinePink = #FF00D9;
color goombaYellow = #FFE500;
color thwompthwompPurple = #7800FF;
color coinYellow = #FFC830;
color hammerCyan = #00FF9C;
color flagRed = #FF0000;
color hitblockMagenta = #DA00FF;

PImage map, gameover, marioL, marioR, bridgeL, bridgeM, bridgeR, dirt, fenceL, fenceM, fenceR, grassB, grassBL, grassBR, grassL, grassR, grassT, grassTL, grassTR, ice, lava0, lava1, lava2, lava3, lava4, lava5, lava6, leafL, leafM, leafR, stone, trunk, trunkLeaf, water1, water2, water3, water4, water5, spike, trampoline, thwomp0, thwomp1, hammer, coinI;
int gridSize = 32;
int objectRefresh = 15;
int playerRefresh = 5;
int frameMultiplier = 60;
int score = 0;
int gravity = 900;

float zoom = 1.65;
float spawnX = 250;
float spawnY = 959;

boolean wKey, aKey, sKey, dKey, upKey, downKey, leftKey, rightKey, spaceKey, swimming, isIdle;
ArrayList<FGameObject> terrain;
ArrayList<FGameObject> enemies;
PImage[] lavaSprites;
PImage[] waterSprites;

PImage[] idle;
PImage[] jump;
PImage[] run;
PImage[] action;
PImage[] goombas;
PImage[] hammerbro;
PImage[] coins;
PImage[] flag;
PImage[] hitblock;

PFont pixelFont;

void setup() {
  size(640, 640, P2D);
  frameRate(frameMultiplier);
  Fisica.init(this);
  loadAssets();
  loadWorld(map);
  loadPlayer();
}

void loadWorld(PImage img) {
  world = new FWorld(-3000, -3000, 3000, 3000);
  world.setGravity(0, 900);
  world.setGrabbable(false);
  borderL = new FBox(gridSize, gridSize*20);
  borderL.setStatic(true);
  borderL.setPosition(-32, 900);
  borderL.setFriction(0);
  world.add(borderL);
  borderR = new FBox(gridSize, gridSize*20);
  borderR.setStatic(true);
  borderR.setPosition(2752, 600);
  borderR.setFriction(0);
  world.add(borderR);
  for (int y = 0; y < img.height; y++) {
    for (int x = 0; x < img.width; x++) {
      color c = img.get(x, y);
      FBox b = new FBox(gridSize, gridSize);
      b.setPosition (x*gridSize, y*gridSize);
      b.setStatic(true);
      int n = img.get(x, y-1);
      int e = img.get(x+1, y);
      int s = img.get(x, y+1);
      int w = img.get(x-1, y);
      if (c == dirtBrown) {
        b.attachImage(dirt);
        b.setName("dirtTile");
        world.add(b);
      } else if (c == grassGreen) {
        b.attachImage(grassT);
        if (e == white) {
          b.attachImage(grassTR);
        }
        if (w == white) {
          b.attachImage(grassTL);
        }
        b.setFriction(3);
        b.setName("grassTile");
        world.add(b);
      } else if (c == leafGreen) {
        if (e == leafGreen && w == leafGreen) {
          b.attachImage(leafM);
        }
        if (s == trunkBrown) {
          b.attachImage(trunkLeaf);
        }
        if (w == white) {
          b.attachImage(leafL);
        }
        if (e == white) {
          b.attachImage(leafR);
        }
        b.setName("leafTile");
        world.add(b);
      } else if (c == trunkBrown) {
        b.attachImage(trunk);
        b.setSensor(true);
        b.setName("trunkTile");
        world.add(b);
      } else if (c == waterBlue && n == white || c == waterBlue && n == iceBlue) {
        FWater wa = new FWater(x*gridSize, y*gridSize);
        wa.setName("waterTile");
        terrain.add(wa);
        world.add(wa);
      } else if (c == waterBlue && n == waterBlue) {
        b.attachImage(water4);
        b.setName("waterTile");
        b.setSensor(true);
        world.add(b);
      } else if (c == stoneGrey) {
        b.attachImage(stone);
        b.setFriction(3);
        b.setName("stoneTile");
        world.add(b);
      } else if (c == lavaRed && n == white || c == lavaRed && n == coinYellow) {
        FLava la = new FLava(x*gridSize, y*gridSize);
        la.setName("lavaTile");
        terrain.add(la);
        world.add(la);
      } else if (c == lavaRed && n == lavaRed) {
        b.attachImage(lava6);
        b.setSensor(true);
        b.setName("lavaTile");
        world.add(b);
      } else if (c == fenceBrown) {
      } else if (c == bridgeBrown) {
        FBridge br = new FBridge(x*gridSize, y*gridSize);
        br.setName("bridgeTile");
        terrain.add(br);
        world.add(br);
      } else if (c == iceBlue) {
        b.attachImage(ice);
        b.setFriction(0.05);
        b.setName("iceTile");
        world.add(b);
      } else if (c == spikeGrey) {
        b.attachImage(spike);
        b.setName("spikeTile");
        world.add(b);
      } else if (c == trampolinePink) {
        b.attachImage(trampoline);
        b.setRestitution(2);
        world.add(b);
      } else if (c == goombaYellow) {
        FGoomba gmb = new FGoomba(x*gridSize, y*gridSize);
        enemies.add(gmb);
        world.add(gmb);
      } else if (c == black) {
        if (e == white) b.attachImage(grassTR);
        if (w == white) b.attachImage(grassTL);
        b.setName("wallTile");
        world.add(b);
      } else if (c == thwompthwompPurple) {
        FThwomp thp = new FThwomp(gridSize*2, gridSize*2, x*gridSize+gridSize/2, y*gridSize+gridSize/2);
        enemies.add(thp);
        world.add(thp);
      } else if (c == coinYellow) {
        FCoin cn = new FCoin(x*gridSize, y*gridSize);
        cn.setName("coinTile");
        terrain.add(cn);
        world.add(cn);
      } else if (c == hammerCyan) {
        FHammerbro hb = new FHammerbro(x*gridSize, y*gridSize);
        hb.setName("hammerbro");
        enemies.add(hb);
        world.add(hb);
      } else if (c == flagRed) {
        FFlag fl = new FFlag(x*gridSize, y*gridSize);
        fl.setName("flagTile");
        terrain.add(fl);
        world.add(fl);
      } else if (c == hitblockMagenta) {
        FHitblock ht = new FHitblock(x*gridSize, y*gridSize);
        ht.setName("hitblockTile");
        terrain.add(ht);
        world.add(ht);
      }
    }
  }
}

void loadPlayer() {
  player = new FPlayer();
  world.add(player);
}

void drawWorld() {
  pushMatrix();
  if (player.getX() < 180) {
    translate(-180*zoom+width/2, -player.getY()*zoom+height/2);
  } else if (player.getX() < 2540) {
    translate(-player.getX()*zoom+width/2, -player.getY()*zoom+height/2);
  } else {
    translate(-2540*zoom+width/2, -player.getY()*zoom+height/2);
  }
  scale(zoom);
  world.step();
  world.draw();
  popMatrix();
}

void actWorld() {
  player.act();
  for (int i = 0; i < terrain.size(); i++) {
    FGameObject t = terrain.get(i);
    t.act();
  }
  for (int i = 0; i < enemies.size(); i++) {
    FGameObject e = enemies.get(i);
    e.act();
  }
  if (!swimming) {
    world.setGravity(0, 900);
    playerRefresh = 5;
  }
  if (swimming) {
    world.setGravity(0, 90);
    playerRefresh = 12;
  }
}

void draw() {
  background(#8FCFFF);
  drawWorld();
  drawInterface();
  actWorld();
}

void drawInterface() {
  textAlign(CENTER, CENTER);
  textSize(50);
  image(coinI, width-64, 0);
  gameover.resize(44, 44);
  image(gameover, width-54, 70);
  textWithBorderInt(player.lives, 0, goombaYellow, width-80, 85);
  textWithBorderInt(score, 0, goombaYellow, width-80, 25);
}

void loadAssets() {
  pixelFont = createFont("fonts/pixelFont.ttf", 200);
  hitblock = new PImage[4];
  for (int i = 0; i < 4; i++) {
    hitblock[i] = loadImage("textures/hitblock"+i+".png");
  }

  flag = new PImage[3];
  for (int i = 0; i < 3; i++) {
    flag[i] = loadImage("textures/flag"+i+".png");
  }

  lavaSprites = new PImage[6];
  for (int i = 0; i < 6; i++) {
    lavaSprites[i] = loadImage("textures/lava"+i+".png");
  }

  waterSprites = new PImage[4];
  for (int i = 0; i < 4; i++) {
    waterSprites[i] = loadImage("textures/water"+i+".png");
  }
  swimming = false;

  idle = new PImage[31];
  for (int i = 0; i < 30; i++) {
    idle[i] = loadImage("textures/PIdle0.png");
  }
  idle[30] = loadImage("textures/PIdle1.png");
  isIdle = true;

  jump = new PImage[1];
  jump[0] = loadImage("textures/PJump0.png");

  run = new PImage[3];
  for (int i = 0; i < 3; i++) {
    run[i] = loadImage("textures/PRun"+i+".png");
  }
  action = idle;

  goombas = new PImage[2];
  for (int i = 0; i < 2; i++) {
    goombas[i] = loadImage("textures/goomba"+i+".png");
  }

  coins = new PImage[4];
  for (int i = 0; i < 4; i++) {
    coins[i] = loadImage("textures/coin"+i+".png");
  }

  hammerbro = new PImage[2];
  for (int i = 0; i < 2; i++) {
    hammerbro[i] = loadImage("textures/hammerbro"+i+".png");
  }
  hammer = loadImage("textures/hammer.png");

  terrain = new ArrayList<FGameObject>();
  enemies = new ArrayList<FGameObject>();
  gameover = loadImage("textures/marioRs.png");
  thwomp0 = loadImage("textures/thwomp0.png");
  thwomp1 = loadImage("textures/thwomp1.png");
  map = loadImage("maps/map.png");
  marioL = loadImage("textures/marioL.png");
  marioR = loadImage("textures/marioR.png");
  bridgeL = loadImage("textures/bridgeL.png");
  bridgeM = loadImage("textures/bridgeM.png");
  bridgeR = loadImage("textures/bridgeR.png");
  dirt = loadImage("textures/dirt.png");
  fenceL = loadImage("textures/fenceL.png");
  fenceM = loadImage("textures/fenceL.png");
  fenceR = loadImage("textures/fenceR.png");
  grassB = loadImage("textures/grassB.png");
  grassBL = loadImage("textures/grassBL.png");
  grassBR = loadImage("textures/grassBR.png");
  grassL = loadImage("textures/grassL.png");
  grassR = loadImage("textures/grassR.png");
  grassT = loadImage("textures/grassT.png");
  grassTL = loadImage("textures/grassTL.png");
  grassTR = loadImage("textures/grassTR.png");
  ice = loadImage("textures/ice.png");
  ice.resize(32, 32);
  lava6 = loadImage("textures/lava6.png");
  leafL = loadImage("textures/leafL.png");
  leafM = loadImage("textures/leafM.png");
  leafR = loadImage("textures/leafR.png");
  stone = loadImage("textures/stone.png");
  trunk = loadImage("textures/trunk.png");
  trunkLeaf = loadImage("textures/trunkLeaf.png");
  water4 = loadImage("textures/water4.png");
  spike = loadImage("textures/spike.png");
  trampoline = loadImage("textures/trampoline.png");
  coinI = loadImage("textures/coin0_scaled.png");
}

void textWithBorderInt(int text, int strokecolor, int fillcolor, int x, int y) {
  fill(strokecolor);
  text(text, x-1, y);
  text(text, x+1, y);
  text(text, x, y-1);
  text(text, x, y+1);
  fill(fillcolor);
  text(text, x, y);
}

void textWithBorderString(String text, int strokecolor, int fillcolor, int x, int y) {
  fill(strokecolor);
  text(text, x-1, y);
  text(text, x+1, y);
  text(text, x, y-1);
  text(text, x, y+1);
  fill(fillcolor);
  text(text, x, y);
}
