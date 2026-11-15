import * as Phaser from "phaser";
import { scripts } from "@/content/scripts";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../constants";
import { isGone, speakLine, wait } from "../cinematic";
import { actions } from "../state/runStore";
import { audio } from "../audio/engine";
import { exhaustConfig, wheelSpinAnim, wheelSpinTexture } from "../art";

// Mars arrival, automatic and unskippable (Phase F re-sequence, Nov 15). The narration drives the
// pictures — every stage runs for exactly as long as its line is spoken (fix C2):
//   1 "Approaching Mars."                         → our craft closes on Mars
//   2–3 Pathfinder lines                          → 1997 FLASHBACK: aeroshell + parachute + airbags,
//                                                   rockets fire, bridle cut, airbags bounce (C5)
//   (unvoiced)                                    → close-up: airbags deflate, petals open (5 frames),
//                                                   Sojourner rolls off → REAL NASA IMAGE
//   4 "Years later, our own lander…"             → PRESENT: aeroshell entry, parachute (C4)
//   5 "The technology has changed…"               → sky crane takes over, powered descent
//   6 "Prepare for touchdown."                    → rover lowered on cables, touchdown, crane flies off
// This follows the script's own order (past first, then "years later"); it replaces the earlier
// "our touchdown → flashback" order of appflow §2.5. Our lander uses a sky crane, never airbags
// or petals, so it is never mistaken for Pathfinder. Art: team AI sprites (`npm run landing-art`).

const HORIZON = 500;
const GROUND = HORIZON + 45; // where landers and rovers touch down

// Airbag frames share one canvas but aren't bottom-aligned: origin = each frame's own base, so the
// cluster always meets the ground on the same line (normal / squished on impact / stretched rebound).
const AIRBAG = [
  { key: "airbag_0", ox: 0.501, oy: 0.972 },
  { key: "airbag_1", ox: 0.4994, oy: 0.923 },
  { key: "airbag_2", ox: 0.4965, oy: 0.996 },
];
const AIRBAG_ART_WIDTH = 285; // visible cluster width in the 300 px texture
// pf_descent (290×600): parachute + capsule end at row ~455, the airbag cluster fills rows 465–600
// and is ~150 px wide, centred.
const PF_SPLIT_Y = 458;
const PF_BAG_WIDTH = 150;
// Pathfinder frames: base of the closed lander (frame 0) is 85.7% down the shared canvas.
const LANDER_ORIGIN = { x: 0.496, y: 0.857 };
const LANDER_ART_WIDTH = 355; // closed lander's visible width in the 560 px texture
// chute_modern (400×550): the parachute lines meet at (197, 434); the capsule below is cropped off.
const CHUTE_LINES = { x: 197 / 400, y: 434 / 550, cropH: 436 };
// entry (aeroshell, 360×275): capsule centre row 137, top row ~5, backshell / heat-shield split at
// row 233 (just below the gold rim).
const ENTRY = { centerY: 137 / 275, topY: 5, splitY: 233 };

export class LandingScene extends Phaser.Scene {
  private present!: Phaser.GameObjects.Container;
  private past!: Phaser.GameObjects.Container;

  constructor() {
    super("Landing");
  }

  create() {
    this.cameras.main.fadeIn(600, 0, 0, 0);
    const space = this.buildApproach();
    this.present = this.buildSurface(false).setVisible(false);
    this.past = this.buildSurface(true).setVisible(false);
    void this.run(space);
  }

  // ---------- builders ----------

  private buildApproach() {
    const c = this.add.container(0, 0);
    c.add(this.add.rectangle(0, 0, W, H, 0x05091a).setOrigin(0));
    const rng = new Phaser.Math.RandomDataGenerator(["voyage-landing"]);
    for (let i = 0; i < 140; i++) c.add(this.add.image(rng.between(0, W), rng.between(0, H), "px_white").setScale(1 / 3).setAlpha(0.7));
    const mars = this.add.container(W * 0.62, H * 0.58);
    mars.add(this.add.circle(0, 0, 200, 0xb65d3a));
    mars.add(this.add.circle(-30, -26, 170, 0xd47946, 0.55));
    for (let i = 0; i < 16; i++) {
      const a = rng.frac() * Math.PI * 2;
      const r = rng.frac() * 160;
      mars.add(this.add.circle(Math.cos(a) * r, Math.sin(a) * r, rng.between(6, 18), 0x713a35, 0.5));
    }
    mars.add(this.add.circle(40, 40, 205, 0x2a0f0a, 0.35)); // night side
    mars.setScale(0.6).setName("mars");
    c.add(mars);
    // Our spacecraft, heat shield first, heading for Mars.
    const craft = this.add.image(W * 0.16, H * 0.2, "entry").setScale(0.16).setAngle(-35).setName("craft");
    c.add(craft);
    return c;
  }

  private buildSurface(past: boolean) {
    const c = this.add.container(0, 0);
    c.add(this.add.rectangle(0, 0, W, HORIZON, past ? 0xcfa77e : 0xd2a274).setOrigin(0));
    c.add(this.add.rectangle(0, HORIZON - 120, W, 120, past ? 0xc79b72 : 0xc2865a, 0.6).setOrigin(0));
    // Same anti-"carpet" treatment as the surface (fix D1): tile at half strength over its average colour.
    c.add(this.add.rectangle(0, HORIZON, W, H - HORIZON, 0xbf4a2f).setOrigin(0));
    c.add(this.add.tileSprite(0, HORIZON, W, H - HORIZON, "ground_mirror").setOrigin(0).setAlpha(0.5));
    const rng = new Phaser.Math.RandomDataGenerator([past ? "pf" : "now"]);
    for (let i = 0; i < 9; i++) {
      const key = rng.pick(["rock_medium_1", "rock_medium_2", "rock_large_1"]);
      const x = rng.between(40, W - 40);
      // keep the landing zones (left-centre) clear of rocks
      if (x > W * 0.22 && x < W * 0.72) continue;
      c.add(this.add.image(x, rng.between(HORIZON + 40, H - 30), key).setScale(rng.realInRange(0.25, 0.5)));
    }
    return c;
  }

  // ---------- timeline ----------

  private async run(space: Phaser.GameObjects.Container) {
    const seg = scripts.landing;
    const mars = space.getByName("mars") as Phaser.GameObjects.Container;
    const craft = space.getByName("craft") as Phaser.GameObjects.Image;

    // 1 — "Approaching Mars."
    this.tweens.add({ targets: mars, scale: 1.7, x: W * 0.58, y: H * 0.85, duration: 6500, ease: "Sine.easeIn" });
    this.tweens.add({ targets: craft, x: W * 0.44, y: H * 0.42, scale: 0.09, duration: 6500 });
    const d0 = await speakLine(this, seg, 0);
    await wait(this, d0 + 2.2);
    if (isGone(this)) return;
    actions.setSubtitle(null);

    // 2–3 — the 1997 flashback, then the real record.
    await this.flashback(space);
    if (isGone(this)) return;

    // 4–6 — our own entry, descent and landing.
    await this.presentLanding();
    if (isGone(this)) return;

    actions.setSubtitle(null);
    actions.setBanner({ label: "PRESENT DAY", title: "Ares Vallis, near Sojourner" });
    await wait(this, 2.4);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    await wait(this, 0.7);
    actions.setStage("surface");
  }

  /** Historical 1997 sequence — visually distinct (sepia + dated banners) from the present (fix C5). */
  private async flashback(space: Phaser.GameObjects.Container) {
    const seg = scripts.landing;
    const cam = this.cameras.main;
    cam.flash(500, 255, 244, 220);
    space.setVisible(false);
    this.past.setVisible(true);
    let sepia: Phaser.FX.ColorMatrix | null = null;
    try {
      sepia = cam.postFX.addColorMatrix();
      sepia.sepia();
    } catch {
      sepia = null; // Canvas renderer: the dated banner still marks the past
    }
    actions.setBanner({ label: "FLASHBACK", title: "Mars Pathfinder · July 4, 1997" });

    // Line 2 — "In 1997, Mars Pathfinder carried Sojourner…": aeroshell under its parachute,
    // airbags already inflated below, drifting down.
    const s = 0.55;
    const pf = this.add.image(W * 0.25, -340, "pf_descent").setOrigin(0.5, 0).setScale(s);
    this.past.add(pf);
    const sway = this.tweens.add({ targets: pf, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.easeInOut" });
    const d1 = await speakLine(this, seg, 1);
    await this.tweenAsync({ targets: pf, y: 40, x: W * 0.29, duration: d1 * 1000, ease: "Sine.easeOut" });
    if (isGone(this)) return;

    // Line 3 — "A parachute and rockets slowed its descent. Giant airbags cushioned the landing as
    // the spacecraft bounced across the Martian surface."
    const d2 = await speakLine(this, seg, 2);
    const lineEnd = this.time.now + d2 * 1000;
    sway.stop();
    pf.setAngle(0);
    // Rockets fire just above the airbags…
    const rockets = this.add.particles(
      pf.x,
      pf.y + 395 * s,
      "soft_blob",
      exhaustConfig({ angle: 90, spread: 24, speed: [160, 300], lifespan: [200, 360], scale: [0.06, 0.2], width: 18, frequency: 8, quantity: 1 }),
    );
    this.past.add(rockets);
    await wait(this, d2 * 0.16);
    // …the bridle is cut: parachute + backshell fly off, the airbag cluster falls free.
    rockets.stop();
    this.time.delayedCall(400, () => rockets.destroy());
    pf.setCrop(0, 0, pf.width, PF_SPLIT_Y);
    this.tweens.add({ targets: pf, x: pf.x - 160, y: pf.y - 420, alpha: 0, duration: 1900, ease: "Sine.easeIn" });
    const bag = this.add.image(pf.x, pf.y + pf.height * s, AIRBAG[0].key);
    bag.setOrigin(AIRBAG[0].ox, AIRBAG[0].oy).setScale((PF_BAG_WIDTH * s) / AIRBAG_ART_WIDTH);
    this.past.add(bag);
    await this.bounceAcross(bag, Math.max(3, (lineEnd - this.time.now) / 1000 - 0.3));
    await wait(this, Math.max(0, (lineEnd - this.time.now) / 1000));
    if (isGone(this)) return;
    actions.setSubtitle(null);

    // Close-up: the airbags deflate and retract, the petals open, Sojourner rolls off.
    cam.pan(bag.x + 30, GROUND - 40, 1100, "Sine.easeInOut");
    cam.zoomTo(2.9, 1100, "Sine.easeInOut");
    await wait(this, 1.2);
    const lander = this.add.image(bag.x, GROUND, "pf_lander_0").setOrigin(LANDER_ORIGIN.x, LANDER_ORIGIN.y);
    lander.setScale((bag.displayWidth * 0.78) / LANDER_ART_WIDTH).setAlpha(0);
    this.past.addAt(lander, this.past.getIndex(bag));
    this.tweens.add({ targets: lander, alpha: 1, duration: 900 });
    await this.tweenAsync({ targets: bag, scaleY: bag.scaleY * 0.25, alpha: 0, duration: 1300, ease: "Sine.easeIn" });
    for (let i = 1; i < 6; i++) {
      await wait(this, 0.5);
      lander.setTexture(`pf_lander_${i}`);
    }
    await wait(this, 0.6);
    actions.setBanner({ label: "FLASHBACK", title: "July 6, 1997 · Sojourner rolls onto Mars" });
    const soj = this.add.image(lander.x, GROUND - 4, "hist_sojourner").setOrigin(0.5, 1);
    soj.setScale((lander.displayWidth * 0.26) / soj.width);
    this.past.add(soj);
    await this.tweenAsync({ targets: soj, x: lander.x + lander.displayWidth * 0.55, y: GROUND + 14, duration: 2600, ease: "Sine.easeInOut" });
    await wait(this, 0.6);

    // The real record: an unretouched NASA photograph, clearly labelled (and unzoomed).
    cam.pan(W / 2, H / 2, 700, "Sine.easeInOut");
    cam.zoomTo(1, 700, "Sine.easeInOut");
    await wait(this, 0.8);
    if (sepia) cam.postFX.clear(); // the real photo must be shown unaltered
    const frame = this.add.rectangle(W / 2, H / 2 - 30, 760, 572, 0x0c1828).setStrokeStyle(2, 0x3f667c);
    const photo = this.add.image(W / 2, H / 2 - 30, "nasa_pf_day1");
    photo.setScale(Math.min(740 / photo.width, 552 / photo.height));
    frame.setAlpha(0);
    photo.setAlpha(0);
    this.tweens.add({ targets: [frame, photo], alpha: 1, duration: 800 });
    actions.setBanner({
      label: "REAL NASA IMAGE",
      title: "Sojourner on the Pathfinder lander, July 4, 1997",
      caption: "NASA/JPL · PIA00611",
    });
    await wait(this, 5);
    this.tweens.add({ targets: [frame, photo], alpha: 0, duration: 600 });
    await wait(this, 0.7);
    frame.destroy();
    photo.destroy();
    this.past.setVisible(false);
  }

  /**
   * The airbag cluster falls, then bounces across the ground in shrinking hops: squished frame
   * on each impact, stretched frame as it springs back up. Hop times follow √height and are
   * scaled so the whole run fills `seconds` (it ends with the narration line).
   */
  private async bounceAcross(bag: Phaser.GameObjects.Image, seconds: number) {
    const hops = [
      { h: 190, dx: 95 },
      { h: 120, dx: 80 },
      { h: 70, dx: 62 },
      { h: 32, dx: 44 },
    ];
    const drop = GROUND - bag.y;
    const impact = 0.12;
    const fixed = impact * (hops.length + 1) + 0.5;
    const units = Math.sqrt(drop) + hops.reduce((sum, hop) => sum + 2 * Math.sqrt(hop.h), 0);
    const k = Math.max(0.03, (seconds - fixed) / units); // seconds per √px
    const frame = (i: number) => bag.setTexture(AIRBAG[i].key).setOrigin(AIRBAG[i].ox, AIRBAG[i].oy);
    const land = async () => {
      frame(1); // squished
      this.dustBurst(bag.x, GROUND, 8);
      this.cameras.main.shake(140, 0.003);
      await wait(this, impact);
      frame(2); // stretched as it springs back
    };

    await this.tweenAsync({ targets: bag, y: GROUND, x: bag.x + 30, duration: k * Math.sqrt(drop) * 1000, ease: "Quad.easeIn" });
    for (const hop of hops) {
      await land();
      const half = k * Math.sqrt(hop.h) * 1000;
      this.time.delayedCall(half * 0.35, () => frame(0));
      await this.tweenAsync({ targets: bag, y: GROUND - hop.h, x: bag.x + hop.dx / 2, duration: half, ease: "Quad.easeOut" });
      await this.tweenAsync({ targets: bag, y: GROUND, x: bag.x + hop.dx / 2, duration: half, ease: "Quad.easeIn" });
    }
    await land();
    frame(0);
    await this.tweenAsync({ targets: bag, x: bag.x + 18, duration: 500, ease: "Sine.easeOut" });
  }

  /** Our own landing: aeroshell entry → parachute → sky crane → rover lowered on cables (fix C4). */
  private async presentLanding() {
    const seg = scripts.landing;
    this.cameras.main.flash(400, 255, 255, 255);
    this.present.setVisible(true);
    actions.setBanner({ label: "PRESENT DAY", title: "Voyage · entry, descent and landing" });

    // The aeroshell is drawn big enough to hold the sky crane (≈200 px, crane ≈198 px), so the
    // camera starts on a WIDE shot (zoomed out, looking up into the sky) for entry and parachute,
    // follows the capsule down, then closes in for the separation. The scenery is extended so
    // the wide shot never sees past its edges.
    const cam = this.cameras.main;
    this.present.addAt(this.add.rectangle(-1600, -2400, W + 3200, HORIZON + 2400, 0xd2a274).setOrigin(0), 0);
    this.present.addAt(this.add.rectangle(-1600, HORIZON, W + 3200, H, 0xbf4a2f).setOrigin(0), 1);
    this.present.addAt(this.add.tileSprite(-1600, HORIZON, W + 3200, H, "ground_mirror").setOrigin(0).setAlpha(0.5), 2);
    cam.setZoom(0.55).centerOn(W * 0.42, -330);

    // Line 4 — "Years later, our own lander is approaching the same red world.": hypersonic entry,
    // heat shield first, with a plasma trail; then the parachute snaps open.
    const pod = this.add.container(-560, -1000).setAngle(-35);
    const SHELL_SCALE = 200 / 358; // aeroshell ≈ 200 px wide
    // backshell (above the gold rim) and heat shield (below it) are the same art, cropped apart
    const backshell = this.add.image(0, 0, "entry").setOrigin(0.5, ENTRY.centerY).setScale(SHELL_SCALE).setCrop(0, 0, 360, ENTRY.splitY);
    const heatShield = this.add
      .image(0, 0, "entry")
      .setOrigin(0.5, ENTRY.centerY)
      .setScale(SHELL_SCALE)
      .setCrop(0, ENTRY.splitY, 360, 275 - ENTRY.splitY);
    // parachute + lines only (capsule cropped off), its lines meeting the top of the backshell
    const chuteScale = 1.2;
    const chute = this.add
      .image(0, (ENTRY.topY - ENTRY.centerY * 275) * SHELL_SCALE, "chute_modern")
      .setOrigin(CHUTE_LINES.x, CHUTE_LINES.y)
      .setCrop(0, 0, 400, CHUTE_LINES.cropH)
      .setScale(chuteScale)
      .setVisible(false);
    pod.add([chute, backshell, heatShield]);
    // Entry plasma streaming back (up-left) off the heat shield.
    const plasma = this.add.particles(
      0,
      0,
      "soft_blob",
      exhaustConfig({ angle: 215, spread: 14, speed: [220, 380], lifespan: [350, 650], scale: [0.25, 0.7], frequency: 7, quantity: 2 }),
    );
    plasma.startFollow(pod, 40, 50);
    const d3 = await speakLine(this, seg, 3);
    const deploy = { x: W * 0.42, y: -420 };
    this.tweens.add({ targets: pod, angle: 0, delay: d3 * 1000 * 0.35, duration: d3 * 1000 * 0.3 });
    await this.tweenAsync({ targets: pod, x: deploy.x, y: deploy.y, duration: d3 * 1000 * 0.55, ease: "Sine.easeOut" });
    plasma.stop();
    this.time.delayedCall(700, () => plasma.destroy());
    // Parachute pops open; the camera follows the capsule down until the ground comes into view.
    chute.setVisible(true).setScale(chuteScale * 0.25);
    this.tweens.add({ targets: chute, scale: chuteScale, duration: 550, ease: "Back.easeOut" });
    const sway = this.tweens.add({ targets: pod, angle: { from: -2.5, to: 2.5 }, yoyo: true, repeat: -1, duration: 1300, ease: "Sine.easeInOut" });
    cam.startFollow(pod, false, 0.06, 0.06, 0, 60);
    const podLand = { x: deploy.x + 30, y: 200 }; // where the separation happens (screen-centred below)
    const descentMs = d3 * 1000 * 0.45 + 1300;
    this.tweens.add({ targets: pod, x: podLand.x, y: podLand.y, duration: descentMs, ease: "Sine.easeInOut" });
    await wait(this, d3 * 0.45);
    if (isGone(this)) return;

    // Line 5 — "The technology has changed…": the camera closes in; the heat shield drops away;
    // the rover and sky crane slide out of the open backshell; backshell + parachute fly off.
    const d4 = await speakLine(this, seg, 4);
    cam.stopFollow();
    cam.pan(W / 2, H / 2, 1300, "Sine.easeInOut");
    cam.zoomTo(1, 1300, "Sine.easeInOut");
    await wait(this, 1.35);
    sway.stop();
    this.tweens.add({ targets: pod, angle: 0, duration: 300 });
    // 1) heat shield separates and falls away
    const shieldWorld = pod.getWorldTransformMatrix();
    pod.remove(heatShield);
    heatShield.setPosition(shieldWorld.tx, shieldWorld.ty);
    this.tweens.add({ targets: heatShield, y: heatShield.y + 520, x: heatShield.x - 60, angle: -25, alpha: 0, duration: 1700, ease: "Quad.easeIn", onComplete: () => heatShield.destroy() });
    await wait(this, 0.6);
    // 2) rover + sky crane slide down out of the open bottom of the backshell — masked so
    //    nothing shows until it's below the rim, then they're fully in the open.
    const rim = pod.y + (ENTRY.splitY - ENTRY.centerY * 275) * SHELL_SCALE;
    const maskG = this.make.graphics({ x: 0, y: 0 }, false).fillStyle(0xffffff).fillRect(-2000, rim, W + 4000, 3000);
    const reveal = maskG.createGeometryMask();
    const craneScale = 0.38;
    const craneStartY = rim - 158;
    const crane = this.add.image(pod.x, craneStartY, "crane_0").setOrigin(0.5, 0).setScale(craneScale).setMask(reveal);
    const craneBody = () => crane.y + crane.displayHeight * 0.44; // underside of the descent stage
    const flicker = this.time.addEvent({ delay: 85, loop: true, callback: () => crane.setTexture(crane.texture.key === "crane_0" ? "crane_1" : "crane_0") });
    // Our rover (the one you'll drive), front view, hanging on the bridle.
    const rover = this.add.sprite(crane.x, craneBody() + 4, wheelSpinTexture("S"), 0).setOrigin(0.5, 0).setScale(0.33).setMask(reveal);
    const cables = this.add.graphics().setMask(reveal);
    let cable = 4;
    const drawCables = () => {
      rover.setPosition(crane.x, craneBody() + cable);
      cables.clear().lineStyle(1.5, 0x2a2a2e, 0.9);
      if (cable > 6) {
        for (const [a, b] of [
          [-14, -24],
          [-5, -8],
          [5, 8],
          [14, 24],
        ]) {
          cables.lineBetween(crane.x + a, craneBody(), rover.x + b, rover.y + 12);
        }
      }
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, drawCables); // the rover hangs under the crane from here on
    const cableTween = (to: number, ms: number) =>
      this.tweenAsync({ targets: { v: cable }, v: to, duration: ms, ease: "Sine.easeInOut", onUpdate: (tw) => (cable = tw.getValue() ?? cable) });
    this.children.bringToTop(pod); // the backshell stays in front of what's still inside it
    await this.tweenAsync({ targets: crane, y: rim + 2, duration: 1900, ease: "Sine.easeOut" });
    crane.clearMask();
    rover.clearMask();
    cables.clearMask();
    maskG.destroy();
    // 3) backshell + parachute let go and drift away; the crane flies on under its own power
    this.tweens.add({ targets: pod, x: pod.x - 240, y: pod.y - 420, alpha: 0, angle: -12, duration: 2200, ease: "Sine.easeIn", onComplete: () => pod.destroy() });
    // Rest of the line: the crane eases forward and down while the bridle starts paying out.
    const rest = Math.max(1.8, d4 - 1.35 - 0.6 - 1.9);
    this.tweens.add({ targets: crane, x: crane.x + 40, y: crane.y + 10, duration: rest * 1000, ease: "Sine.easeInOut" });
    await cableTween(70, rest * 1000); // the bridle starts paying out
    if (isGone(this)) return;

    // Line 6 — "Prepare for touchdown.": the rover is lowered slowly to the ground.
    const d5 = await speakLine(this, seg, 5);
    const finalCable = GROUND - rover.displayHeight * 0.9 - craneBody();
    await cableTween(finalCable, Math.max(d5, 2.6) * 1000);
    if (isGone(this)) return;

    // Touchdown → cut the cables → the crane flies away; the rover rolls off.
    audio.sfx("touchdown");
    this.dustBurst(rover.x, GROUND, 20);
    this.cameras.main.shake(300, 0.004);
    await wait(this, 0.7);
    this.events.off(Phaser.Scenes.Events.UPDATE, drawCables);
    cables.destroy();
    this.tweens.add({ targets: crane, x: crane.x + 620, y: -260, duration: 2200, ease: "Sine.easeIn", onComplete: () => flicker.remove() });
    await wait(this, 1.0);
    rover.setTexture(wheelSpinTexture("E"), 0).setOrigin(0.5, 1).setPosition(rover.x, GROUND + 18);
    rover.play(wheelSpinAnim("E"));
    await this.tweenAsync({ targets: rover, x: rover.x + 200, y: GROUND + 34, duration: 2200, ease: "Sine.easeInOut" });
    rover.stop();
  }

  // ---------- helpers ----------

  private dustBurst(x: number, y: number, n = 18) {
    const e = this.add.particles(x, y, "px_dust", {
      speed: { min: 60, max: 200 },
      angle: { min: 190, max: 350 },
      lifespan: 900,
      scale: { start: 2.4, end: 0.4 },
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    });
    e.explode(n);
    this.time.delayedCall(1200, () => e.destroy());
  }

  private tweenAsync(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: () => resolve() }));
  }
}
