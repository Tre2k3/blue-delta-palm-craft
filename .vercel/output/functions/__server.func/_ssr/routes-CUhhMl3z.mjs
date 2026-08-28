import { r as __toESM } from "../_runtime.mjs";
import { _ as formatRunClock, a as GameEngine, g as commerce, i as GAME_TITLE, l as TIPS, n as BRAND, o as POIS, r as GAME_BUILD_VERSION, t as APPAREL, u as TROPHIES, v as installAnalyticsTestHook, y as installCommerceTestHook } from "./engine-CGVC5kxI.mjs";
import { M as require_react, h as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Shirt, c as Map, i as SwitchCamera, n as Trophy, o as Settings, r as Target, s as Play, t as Volume2 } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CUhhMl3z.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ErrorBoundary = class extends import_react.Component {
	state = { err: null };
	static getDerivedStateFromError(err) {
		return { err };
	}
	componentDidCatch(err, info) {
		if (typeof console !== "undefined") console.error("[sack]", err, info.componentStack);
	}
	render() {
		if (!this.state.err) return this.props.children;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-full w-full items-center justify-center bg-bg px-6 text-fg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-2xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] uppercase tracking-[0.24em] text-gold",
						children: "$ackReligious · Memphis"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display mt-2 text-4xl text-fg",
						children: "We couldn't load Memphis"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: "The Drop Day world failed to start. Retry to boot again. Your save stays on this device."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-6 min-h-12 w-full rounded-xl bg-primary font-display text-2xl text-primary-fg",
						onClick: () => {
							this.setState({ err: null });
							window.location.reload();
						},
						children: "Retry"
					})
				]
			})
		});
	}
};
function RotatePrompt() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "sack-rotate-prompt pointer-events-none fixed inset-0 z-[80] hidden items-center justify-center bg-bg px-8 text-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto max-w-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] uppercase tracking-[0.28em] text-gold",
					children: "$ackReligious"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display mt-2 text-5xl text-fg",
					children: "Rotate your phone"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm leading-relaxed text-muted",
					children: "Memphis plays in landscape. Turn your phone sideways to walk the block, hit HQ, and ball the 901 Court."
				})
			]
		})
	});
}
var emptyHud = {
	mode: "menu",
	sackdollars: 0,
	respect: 0,
	missionTitle: "",
	missionStep: "",
	missionProgress: "0/0",
	missionChapter: "CHAPTER 01",
	interactHint: null,
	locationName: "Memphis",
	district: "901",
	dialogue: null,
	shopOpen: false,
	toast: null,
	equipped: null,
	owned: [],
	basketball: null,
	paused: false,
	started: false,
	missionComplete: false,
	cinematic: null,
	letterbox: 0,
	worldHour: 16,
	inputDevice: "keyboard",
	promptButton: "E",
	trophies: [],
	trophyPopup: null,
	pauseTab: "resume",
	settings: {
		master: .85,
		music: .42,
		sfx: .7,
		shake: true,
		rumble: true,
		cameraView: "third",
		sensitivity: 1,
		quality: "high",
		reduceMotion: false
	},
	sideMissions: [],
	highScore: 0,
	hasSave: false,
	cameraView: "third",
	steps: [],
	dropRun: {
		run: 1,
		time: 0,
		combo: 0,
		bestCombo: 0,
		points: 0,
		courtTarget: 8,
		grade: null,
		recap: false,
		deliveries: 0,
		ballMakes: 0,
		ballPerfects: 0,
		ballScore: 0,
		payout: 0,
		respectEarned: 0,
		par: 240,
		active: false
	},
	uiPulse: 0,
	bestGrade: null,
	bestRunScore: 0,
	buildVersion: GAME_BUILD_VERSION,
	dropLive: false
};
function formatHour(h) {
	const hr = Math.floor(h);
	const m = Math.floor((h - hr) * 60);
	const ap = hr >= 12 ? "PM" : "AM";
	return `${hr % 12 === 0 ? 12 : hr % 12}:${m.toString().padStart(2, "0")} ${ap}`;
}
var TABS = [
	{
		id: "resume",
		label: "Resume",
		icon: Play
	},
	{
		id: "map",
		label: "Map",
		icon: Map
	},
	{
		id: "missions",
		label: "Missions",
		icon: Target
	},
	{
		id: "wardrobe",
		label: "Wardrobe",
		icon: Shirt
	},
	{
		id: "trophies",
		label: "Trophies",
		icon: Trophy
	},
	{
		id: "settings",
		label: "Settings",
		icon: Settings
	}
];
function GameApp() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ErrorBoundary, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotatePrompt, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameShell, {})] });
}
function loadCopy(pct) {
	if (pct < .22) return "Loading Memphis...";
	if (pct < .48) return "Loading Benji...";
	if (pct < .78) return "Loading SackReligious HQ...";
	return "Loading The Drop...";
}
function GameShell() {
	const canvasRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const [hud, setHud] = (0, import_react.useState)(emptyHud);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [loadPct, setLoadPct] = (0, import_react.useState)(0);
	const [bootError, setBootError] = (0, import_react.useState)(null);
	const [titlePhase, setTitlePhase] = (0, import_react.useState)("press");
	const [titleSettings, setTitleSettings] = (0, import_react.useState)(false);
	const [tip, setTip] = (0, import_react.useState)(TIPS[0]);
	const stickRef = (0, import_react.useRef)({
		id: null,
		ox: 0,
		oy: 0
	});
	(0, import_react.useEffect)(() => {
		installAnalyticsTestHook();
		installCommerceTestHook();
		commerce.init();
		window.__SACK_BUILD__ = {
			version: GAME_BUILD_VERSION,
			title: GAME_TITLE
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let eng;
		let cancelled = false;
		(async () => {
			try {
				eng = new GameEngine(canvas);
				engineRef.current = eng;
				eng.onHud = (h) => setHud({ ...h });
				eng.onLoad = (p) => setLoadPct(p);
				await eng.init();
				if (cancelled) {
					eng.destroy();
					return;
				}
				eng.startLoop();
				setReady(true);
				setHud(eng.getHud());
				setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
			} catch (e) {
				setBootError(e instanceof Error ? e.message : "Failed to start");
			}
		})();
		return () => {
			cancelled = true;
			engineRef.current?.destroy();
			engineRef.current = null;
		};
	}, []);
	const boot = (0, import_react.useCallback)((fresh) => {
		engineRef.current?.start(fresh);
		setHud((h) => ({
			...h,
			started: true
		}));
	}, []);
	(0, import_react.useEffect)(() => {
		if (hud.started || !ready) return;
		const go = (e) => {
			if (e.code === "Tab" || e.code.startsWith("F")) return;
			if (titlePhase === "press") {
				setTitlePhase("choose");
				return;
			}
			if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") boot(false);
		};
		window.addEventListener("keydown", go);
		return () => window.removeEventListener("keydown", go);
	}, [
		hud.started,
		ready,
		titlePhase,
		boot
	]);
	const onBuy = (0, import_react.useCallback)((id) => {
		engineRef.current?.buyItem(id);
	}, []);
	const closeShop = (0, import_react.useCallback)(() => {
		engineRef.current?.closeShop();
	}, []);
	const advanceDialogue = (0, import_react.useCallback)(() => {
		engineRef.current?.advanceDialogue();
	}, []);
	const onStickStart = (e) => {
		const t = e.changedTouches[0];
		if (!t) return;
		const rect = e.currentTarget.getBoundingClientRect();
		stickRef.current = {
			id: t.identifier,
			ox: rect.left + rect.width / 2,
			oy: rect.top + rect.height / 2
		};
		e.preventDefault();
	};
	const onStickMove = (e) => {
		const eng = engineRef.current;
		if (!eng) return;
		for (const t of Array.from(e.changedTouches)) {
			if (t.identifier !== stickRef.current.id) continue;
			const dx = t.clientX - stickRef.current.ox;
			const dy = t.clientY - stickRef.current.oy;
			const max = 48;
			const len = Math.hypot(dx, dy) || 1;
			const s = Math.min(1, len / max);
			eng.input.touch.mx = dx / len * s;
			eng.input.touch.my = dy / len * s;
		}
		e.preventDefault();
	};
	const onStickEnd = (e) => {
		const eng = engineRef.current;
		if (!eng) return;
		for (const t of Array.from(e.changedTouches)) if (t.identifier === stickRef.current.id) {
			eng.input.touch.mx = 0;
			eng.input.touch.my = 0;
			stickRef.current.id = null;
		}
	};
	const lb = Math.max(0, Math.min(1, hud.letterbox));
	const bar = Math.round(52 * lb);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-full w-full overflow-hidden bg-bg text-fg select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "absolute inset-0 h-full w-full touch-none",
				style: { imageRendering: "auto" },
				onClick: () => {
					if (hud.started && !hud.paused) canvasRef.current?.requestPointerLock?.();
				}
			}),
			bar > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-x-0 top-0 z-40 bg-black",
				style: { height: bar }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-black",
				style: { height: bar }
			})] }),
			!hud.started && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-0 z-40 flex flex-col",
				onPointerDown: () => {
					if (titlePhase === "press" && ready) setTitlePhase("choose");
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/game/opening-title.jpg",
						alt: "",
						className: "absolute inset-0 h-full w-full object-cover",
						style: { objectPosition: "68% 46%" },
						crossOrigin: "anonymous"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/35" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-0 inset-x-0 h-8 bg-black" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-0 inset-x-0 h-8 bg-black" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 flex h-full flex-col justify-between px-6 py-10 sm:px-12",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-primary text-xl tracking-[0.22em]",
									children: BRAND.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-[11px] uppercase tracking-[0.42em] text-gold",
									children: BRAND.line
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-[11px] uppercase tracking-[0.28em] text-muted",
									children: "A Memphis Open World"
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "max-w-lg",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
										className: "font-display text-6xl leading-[0.85] text-fg sm:text-8xl",
										children: BRAND.city.toUpperCase()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 font-display text-3xl text-primary sm:text-4xl",
										children: BRAND.zip
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-4 max-w-sm text-sm leading-relaxed text-muted",
										children: [
											"Play as Benji. Run Drop Day, ball the 901 Court, earn ",
											BRAND.currency,
											", and re-up the fit."
										]
									}),
									!ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-8 max-w-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-sm tracking-widest text-muted",
												children: loadCopy(loadPct)
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-2 h-1.5 overflow-hidden rounded-full bg-white/15",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "h-full bg-primary transition-all",
													style: { width: `${Math.round(loadPct * 100)}%` }
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1 text-[11px] text-subtle",
												children: [Math.round(loadPct * 100), "%"]
											})
										]
									}),
									ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-8 flex flex-col gap-2 max-w-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => boot(false),
												className: "min-h-12 rounded-lg bg-primary px-6 font-display text-2xl text-primary-fg transition hover:brightness-110 active:scale-[0.98]",
												children: "ENTER MEMPHIS"
											}),
											hud.hasSave && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => boot(false),
												className: "min-h-11 rounded-lg border border-gold/50 bg-surface/70 px-6 font-display text-xl text-gold hover:bg-surface-2",
												children: "CONTINUE"
											}),
											hud.hasSave && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => boot(true),
												className: "min-h-12 rounded-lg border border-border bg-surface/80 px-6 font-display text-2xl text-fg hover:bg-surface-2",
												children: "NEW GAME"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setTitleSettings((v) => !v),
												className: "min-h-10 rounded-lg border border-border/70 px-6 text-sm uppercase tracking-wider text-muted hover:text-fg",
												children: "Settings"
											})
										]
									}),
									bootError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 max-w-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-sm text-danger",
												children: "We couldn't load Memphis."
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 text-xs text-muted",
												children: bootError
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "mt-2 min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg",
												onClick: () => window.location.reload(),
												children: "Retry"
											})
										]
									}),
									titleSettings && ready && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-4 max-w-xs rounded-xl border border-border bg-panel p-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseSettings, {
											settings: hud.settings,
											onChange: (s) => engineRef.current?.applySettings(s)
										})
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-end justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "max-w-sm text-[11px] leading-relaxed text-subtle",
									children: tip
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "hidden text-[11px] text-subtle sm:block",
									children: [
										"WASD move · ",
										hud.promptButton,
										" talk · Shift run · Esc pause · Pad supported"
									]
								})]
							})
						]
					})
				]
			}),
			hud.started && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm",
							style: { transform: hud.uiPulse > .15 ? `scale(${1 + hud.uiPulse * .06})` : void 0 },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/game/sack-icon.png",
								alt: "",
								className: "h-7 w-7"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-wider text-muted",
								children: "$ackdollars"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "tabular font-display text-2xl leading-none text-gold",
								children: ["$", hud.sackdollars]
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] uppercase tracking-wider text-muted",
									children: "Respect"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "tabular font-display text-xl leading-none text-gold",
									children: hud.respect
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-px bg-border" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] uppercase tracking-wider text-muted",
									children: "901"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "tabular text-xs font-medium text-fg",
									children: formatHour(hud.worldHour)
								})] })
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-[15rem] rounded-xl border border-border bg-panel px-3 py-2 text-right backdrop-blur-sm sm:max-w-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-[0.18em] text-primary",
								children: hud.missionChapter
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-lg leading-none text-gold",
								children: hud.missionTitle
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm font-medium leading-snug text-fg",
								children: hud.missionStep
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted tabular",
								children: hud.missionProgress
							}),
							hud.dropLive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-[11px] uppercase tracking-[0.16em] text-gold",
								children: "Drop live · free roam"
							}),
							(hud.dropRun.active || hud.dropRun.points > 0) && !hud.missionComplete && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-[11px] tabular text-primary",
								children: [
									"RUN ",
									hud.dropRun.run,
									" · ",
									formatRunClock(hud.dropRun.time),
									" · ",
									hud.dropRun.points,
									hud.dropRun.combo > 1 ? ` · x${hud.dropRun.combo}` : ""
								]
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute left-3 top-[9.6rem] z-20 sm:top-[10.6rem]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-border bg-panel px-3 py-1.5 text-xs text-muted backdrop-blur-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fg",
								children: hud.locationName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mx-1.5 text-subtle",
								children: "/"
							}),
							hud.district
						]
					})
				}),
				hud.interactHint && hud.mode === "world" && !hud.cinematic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute left-1/2 top-[44%] z-20 -translate-x-1/2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 rounded-full border border-primary/35 bg-panel px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-sm",
						style: { transform: hud.uiPulse > .1 ? `scale(${1 + hud.uiPulse * .08})` : void 0 },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary px-1.5 font-display text-sm text-primary-fg",
							children: hud.promptButton
						}), hud.interactHint]
					})
				}),
				hud.toast && !hud.cinematic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-xl border border-primary/30 bg-surface-2 px-4 py-2 text-sm font-medium text-fg shadow-xl",
						children: hud.toast
					})
				}),
				hud.trophyPopup && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `pointer-events-none absolute z-40 ${hud.basketball ? "left-3 top-[13.5rem]" : "right-3 top-28 sm:top-32"}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2 shadow-2xl backdrop-blur-md",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "h-5 w-5 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-wider text-muted",
								children: "Trophy unlocked"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-fg",
								children: hud.trophyPopup.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] capitalize text-primary",
								children: hud.trophyPopup.rank
							})
						] })]
					})
				}),
				hud.basketball && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute right-3 top-28 z-20 rounded-xl border border-border bg-panel px-4 py-3 backdrop-blur-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg text-primary",
							children: "901 COURT"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "tabular text-3xl font-semibold leading-none text-fg",
							children: hud.basketball.score
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-muted",
							children: [
								hud.basketball.timeLeft,
								"s · ",
								hud.basketball.shots,
								" shots · need ",
								hud.basketball.target
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-0.5 text-[10px] uppercase tracking-wider text-gold",
							children: [
								hud.basketball.zone,
								" · ",
								hud.basketball.perfects,
								" perfect"
							]
						}),
						hud.basketball.combo > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 font-display text-xl text-primary",
							children: [
								"x",
								hud.basketball.combo,
								" STREAK"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "pointer-events-auto mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-muted",
							onClick: () => engineRef.current?.exitBasketball(),
							children: "Leave court"
						})
					]
				}),
				hud.started && !hud.paused && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "absolute left-3 bottom-24 z-20 flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 text-xs text-fg backdrop-blur-sm sm:bottom-3",
					onClick: () => engineRef.current?.toggleView(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchCamera, { className: "h-4 w-4 text-gold" }), hud.cameraView === "first" ? "First person" : "Third person"]
				}),
				hud.cinematic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute inset-0 z-30 flex items-end justify-start p-8 sm:p-12",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] uppercase tracking-[0.28em] text-primary",
						children: hud.cinematic.subtitle
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display mt-1 text-5xl text-fg sm:text-6xl",
						children: hud.cinematic.title
					})] })
				}),
				hud.dialogue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
					role: "dialog",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: advanceDialogue,
						className: "w-full max-w-2xl rounded-2xl border border-border bg-panel p-4 text-left shadow-2xl backdrop-blur-md",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3",
							children: [hud.dialogue.speaker === "K Blanco" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/game/k-blanco-portrait.png",
								alt: "",
								className: "h-16 w-16 shrink-0 rounded-xl object-cover object-top",
								crossOrigin: "anonymous"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-semibold uppercase tracking-wider text-primary",
										children: hud.dialogue.speaker
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-base leading-relaxed text-fg",
										children: hud.dialogue.text
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-3 text-xs text-muted",
										children: [hud.promptButton, " continue"]
									})
								]
							})]
						})
					})
				}),
				hud.shopOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-0 z-40 flex items-end justify-center bg-bg/70 p-3 backdrop-blur-sm sm:items-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative h-28 shrink-0 overflow-hidden sm:h-36",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: "/game/featured-products.png",
										alt: "",
										className: "h-full w-full object-cover object-center",
										crossOrigin: "anonymous"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "absolute bottom-3 left-4 right-4 flex items-end justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-display text-2xl text-primary",
											children: "HQ SHOP"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted",
											children: hud.dropLive ? "Drop live · virtual fit + BUY IRL" : "Virtual equip · BUY IRL on the real site"
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "tabular font-display text-2xl text-gold",
											children: ["$", hud.sackdollars]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex-1 overflow-y-auto p-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid gap-2",
									children: APPAREL.map((item) => {
										const owned = hud.owned.includes(item.id);
										const eq = hud.equipped === item.id;
										const locked = Boolean(item.respectRequired && hud.respect < item.respectRequired && !owned);
										const real = commerce.productForOutfit(item.id);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-3",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
														style: { backgroundColor: item.color },
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "font-display text-lg text-white/90",
															children: item.category === "hat" ? "CAP" : item.category === "chain" ? "$" : "SR"
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0 flex-1",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: "truncate font-medium text-fg",
																children: item.name
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: "truncate text-xs text-muted",
																children: locked ? `Respect ${item.respectRequired} to unlock` : item.description
															}),
															real?.sizes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
																className: "mt-0.5 text-[10px] uppercase tracking-wider text-subtle",
																children: [
																	"IRL ",
																	real.sizes.join(" · "),
																	real.price != null ? ` · $${real.price}` : ""
																]
															})
														]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														"data-testid": `buy-${item.id}`,
														disabled: locked,
														onClick: () => onBuy(item.id),
														className: `min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${eq ? "bg-primary/20 text-primary" : locked ? "border border-border bg-surface text-muted" : owned ? "border border-border bg-surface text-fg" : "bg-primary text-primary-fg"}`,
														children: eq ? "On" : locked ? "Locked" : owned ? "Equip" : `$${item.price}`
													})
												]
											}), real && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													"data-testid": `view-${real.id}`,
													onClick: () => commerce.viewProduct(real),
													className: "min-h-9 flex-1 rounded-lg border border-border bg-surface text-xs font-semibold uppercase tracking-wider text-fg",
													children: "View product"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													"data-testid": `buy-irl-${real.id}`,
													onClick: () => commerce.buyIrl(real),
													className: "min-h-9 flex-1 rounded-lg border border-gold/50 bg-gold/15 text-xs font-semibold uppercase tracking-wider text-gold",
													children: "Buy IRL"
												})]
											})]
										}, item.id);
									})
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "border-t border-border p-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: closeShop,
									className: "min-h-11 w-full rounded-xl border border-border bg-surface-2 font-medium text-fg",
									children: "Back to streets"
								})
							})
						]
					})
				}),
				hud.dropRun.recap && !hud.cinematic && !hud.shopOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-0 z-40 flex items-end justify-center bg-bg/65 p-3 backdrop-blur-sm sm:items-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] uppercase tracking-[0.22em] text-primary",
								children: ["Drop Day · Run ", hud.dropRun.run]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display mt-1 text-6xl leading-none text-gold",
								children: hud.dropRun.grade ?? "D"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: "Play better, earn more, look fresher."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "mt-4 grid grid-cols-2 gap-2 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-border bg-surface-2 px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[10px] uppercase tracking-wider text-muted",
											children: "Time"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "tabular font-medium text-fg",
											children: formatRunClock(hud.dropRun.time)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-border bg-surface-2 px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[10px] uppercase tracking-wider text-muted",
											children: "Score"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "tabular font-medium text-fg",
											children: hud.dropRun.points
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-border bg-surface-2 px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[10px] uppercase tracking-wider text-muted",
											children: "Deliveries"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "tabular font-medium text-fg",
											children: hud.dropRun.deliveries
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-border bg-surface-2 px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[10px] uppercase tracking-wider text-muted",
											children: "Best combo"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "tabular font-medium text-fg",
											children: hud.dropRun.bestCombo
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-border bg-surface-2 px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[10px] uppercase tracking-wider text-muted",
											children: "Court"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
											className: "tabular font-medium text-fg",
											children: [
												hud.dropRun.ballScore,
												" · ",
												hud.dropRun.ballPerfects,
												" perfect"
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-border bg-surface-2 px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[10px] uppercase tracking-wider text-muted",
											children: "Payout"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
											className: "tabular font-medium text-gold",
											children: [
												"+$",
												hud.dropRun.payout,
												" · +",
												hud.dropRun.respectEarned,
												" respect"
											]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 flex flex-col gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => engineRef.current?.replayDrop(),
									className: "min-h-11 rounded-xl bg-primary font-display text-2xl text-primary-fg",
									children: "RUN IT BACK"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => engineRef.current?.dismissRecap(),
									className: "min-h-11 rounded-xl border border-border bg-surface-2 font-medium text-fg",
									children: "Keep roaming"
								})]
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative h-28 w-28 touch-none rounded-full border border-border bg-panel/80 backdrop-blur-sm",
						onTouchStart: onStickStart,
						onTouchMove: onStickMove,
						onTouchEnd: onStickEnd,
						onTouchCancel: onStickEnd,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-primary/20" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute bottom-2 left-0 right-0 text-center text-[10px] text-muted",
							children: "MOVE"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-panel font-display text-lg text-fg",
								onTouchStart: (e) => {
									e.preventDefault();
									if (engineRef.current) engineRef.current.input.touch.lookX = -1;
								},
								onTouchEnd: (e) => {
									e.preventDefault();
									if (engineRef.current) engineRef.current.input.touch.lookX = 0;
								},
								children: "←"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-panel font-display text-lg text-fg",
								onTouchStart: (e) => {
									e.preventDefault();
									if (engineRef.current) engineRef.current.input.touch.lookX = 1;
								},
								onTouchEnd: (e) => {
									e.preventDefault();
									if (engineRef.current) engineRef.current.input.touch.lookX = 0;
								},
								children: "→"
							})]
						}), hud.mode === "basketball" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-fg shadow-lg active:scale-95",
							onTouchStart: (e) => {
								e.preventDefault();
								const eng = engineRef.current;
								if (!eng) return;
								eng.input.touch.shoot = true;
								eng.beginCharge();
							},
							onTouchEnd: (e) => {
								e.preventDefault();
								const eng = engineRef.current;
								if (!eng) return;
								eng.input.touch.shoot = false;
								eng.releaseShot();
							},
							children: "SHOOT"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-end gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex h-14 w-14 items-center justify-center rounded-full border border-border bg-panel font-display text-sm text-fg shadow-lg active:scale-95",
								onTouchStart: (e) => {
									e.preventDefault();
									const eng = engineRef.current;
									if (!eng) return;
									eng.input.queueJump();
								},
								onTouchEnd: (e) => {
									e.preventDefault();
									const eng = engineRef.current;
									if (!eng) return;
									eng.input.touch.jump = false;
								},
								onTouchCancel: (e) => {
									e.preventDefault();
									const eng = engineRef.current;
									if (!eng) return;
									eng.input.touch.jump = false;
								},
								children: "JUMP"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-2xl text-primary-fg shadow-lg active:scale-95",
								onClick: () => engineRef.current?.tryInteract(),
								children: hud.promptButton
							})]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute bottom-3 right-3 z-10 hidden rounded-lg border border-border bg-panel/70 px-2 py-1 text-[10px] text-muted sm:block",
					children: [
						"WASD · Q/R look · V camera · ",
						hud.promptButton,
						" · Space jump"
					]
				}),
				hud.paused && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-0 z-50 flex items-stretch bg-bg/80 backdrop-blur-md",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/game/memphis-dusk.jpg",
						alt: "",
						className: "absolute inset-0 h-full w-full object-cover opacity-25",
						crossOrigin: "anonymous"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex w-full max-w-5xl mx-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
							className: "flex w-44 shrink-0 flex-col gap-1 border-r border-border p-4 sm:w-56",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-3 font-display text-2xl text-primary",
								children: "PAUSED"
							}), TABS.map((t) => {
								const Icon = t.icon;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										if (t.id === "resume") engineRef.current?.resume();
										else engineRef.current?.setPauseTab(t.id);
									},
									className: `flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium ${hud.pauseTab === t.id ? "bg-primary text-primary-fg" : "text-fg hover:bg-surface-2"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }), t.label]
								}, t.id);
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1 overflow-y-auto p-5",
							children: [
								hud.pauseTab === "map" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseMap, { district: hud.locationName }),
								hud.pauseTab === "missions" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseMissions, {
									chapter: hud.missionChapter,
									title: hud.missionTitle,
									steps: hud.steps,
									sides: hud.sideMissions,
									dropRun: hud.dropRun,
									bestGrade: hud.bestGrade,
									onReplay: () => engineRef.current?.replayDrop()
								}),
								hud.pauseTab === "wardrobe" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseWardrobe, {
									owned: hud.owned,
									equipped: hud.equipped,
									onEquip: onBuy
								}),
								hud.pauseTab === "trophies" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseTrophies, { unlocked: hud.trophies }),
								hud.pauseTab === "settings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseSettings, {
									settings: hud.settings,
									onChange: (p) => engineRef.current?.applySettings(p)
								}),
								hud.pauseTab === "resume" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex h-full flex-col justify-center",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-display text-5xl text-fg",
											children: "MEMPHIS"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-2 text-sm text-muted",
											children: [
												hud.locationName,
												" · ",
												formatHour(hud.worldHour),
												" · High score ",
												hud.highScore
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-6 flex max-w-sm flex-col gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													className: "min-h-11 rounded-xl bg-primary font-display text-2xl text-primary-fg",
													onClick: () => engineRef.current?.resume(),
													children: "Resume"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													className: "min-h-11 rounded-xl border border-border bg-surface-2 text-sm font-semibold text-fg",
													onClick: () => engineRef.current?.restartMission(),
													children: "Restart mission"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													className: "min-h-11 rounded-xl border border-border text-sm font-semibold text-muted",
													onClick: () => engineRef.current?.returnToTitle(),
													children: "Main menu"
												})
											]
										})
									]
								})
							]
						})]
					})]
				})
			] })
		]
	}, 12);
}
function PauseMap({ district }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-[11px] uppercase tracking-wider text-muted",
			children: ["City map · ", district]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: "MEMPHIS 901"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative mt-4 aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-2",
			children: POIS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute -translate-x-1/2 -translate-y-1/2 text-center",
				style: {
					left: `${p.x / 3072 * 100}%`,
					top: `${p.y / 2304 * 100}%`
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto h-2.5 w-2.5 rounded-full bg-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-[9px] uppercase tracking-wide text-fg",
					children: p.label
				})]
			}, p.id))
		})
	] });
}
function PauseMissions({ chapter, title, steps, sides, dropRun, bestGrade, onReplay }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] uppercase tracking-wider text-primary",
			children: chapter
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: title
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-1 text-xs text-muted",
			children: [
				"Run ",
				dropRun.run,
				" · best grade ",
				bestGrade ?? "—",
				" · ",
				dropRun.points,
				" pts"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-4 space-y-2",
			children: steps.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: `rounded-lg border px-3 py-2 ${s.done ? "border-border bg-surface-2 text-muted" : "border-primary/30 bg-surface text-fg"}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium",
					children: s.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: s.description
				})]
			}, s.id))
		}),
		steps.every((s) => s.done) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: onReplay,
			className: "mt-4 min-h-11 w-full rounded-xl bg-primary font-display text-xl text-primary-fg",
			children: "RUN IT BACK"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-6 text-[11px] uppercase tracking-wider text-muted",
			children: "Side jobs"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-2 space-y-2",
			children: sides.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `text-sm font-medium ${s.done ? "text-muted" : "text-fg"}`,
					children: s.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: s.description
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "tabular text-xs text-primary",
					children: s.done ? "DONE" : `$${s.reward}`
				})]
			}, s.id))
		})
	] });
}
function PauseWardrobe({ owned, equipped, onEquip }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] uppercase tracking-wider text-muted",
			children: "Locker"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: "WARDROBE"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 grid gap-2",
			children: APPAREL.filter((a) => owned.includes(a.id)).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => onEquip(a.id),
				className: `flex items-center justify-between rounded-lg border px-3 py-2 text-left ${equipped === a.id ? "border-primary bg-primary/10" : "border-border bg-surface-2"}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-medium text-fg",
					children: a.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs text-muted",
					children: equipped === a.id ? "Equipped" : "Equip"
				})]
			}, a.id))
		})
	] });
}
function PauseTrophies({ unlocked }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-[11px] uppercase tracking-wider text-muted",
			children: [
				unlocked.length,
				"/",
				TROPHIES.length,
				" unlocked"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: "TROPHIES"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-4 grid gap-2 sm:grid-cols-2",
			children: TROPHIES.map((t) => {
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: `rounded-lg border px-3 py-2 ${unlocked.includes(t.id) ? "border-primary/40 bg-surface" : "border-border bg-surface-2 opacity-60"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium text-fg",
							children: t.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: t.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[10px] uppercase tracking-wider text-primary",
							children: t.rank
						})
					]
				}, t.id);
			})
		})
	] });
}
function PauseSettings({ settings, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] uppercase tracking-wider text-muted",
			children: "Audio and feel"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: "SETTINGS"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 max-w-md space-y-5",
			children: [
				[
					["master", "Master"],
					["music", "Music"],
					["sfx", "Effects"]
				].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-2 text-xs uppercase tracking-wider text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "h-3.5 w-3.5" }), label]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 0,
						max: 1,
						step: .01,
						value: settings[key],
						onChange: (e) => onChange({ [key]: Number(e.target.value) }),
						className: "mt-2 w-full accent-primary"
					})]
				}, key)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm",
					children: ["Camera shake", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: settings.shake,
						onChange: (e) => onChange({ shake: e.target.checked }),
						className: "accent-primary"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm",
					children: ["Controller rumble", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: settings.rumble,
						onChange: (e) => onChange({ rumble: e.target.checked }),
						className: "accent-primary"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm",
					children: ["Camera", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `rounded-md px-2 py-1 text-xs ${settings.cameraView === "third" ? "bg-primary text-primary-fg" : "text-muted"}`,
							onClick: () => onChange({ cameraView: "third" }),
							children: "Third"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `rounded-md px-2 py-1 text-xs ${settings.cameraView === "first" ? "bg-primary text-primary-fg" : "text-muted"}`,
							onClick: () => onChange({ cameraView: "first" }),
							children: "First"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs uppercase tracking-wider text-muted",
						children: "Camera sensitivity"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: .4,
						max: 1.8,
						step: .05,
						value: settings.sensitivity,
						onChange: (e) => onChange({ sensitivity: Number(e.target.value) }),
						className: "mt-2 w-full accent-primary"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm",
					children: ["Graphics", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-1",
						children: [
							"low",
							"medium",
							"high"
						].map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `rounded-md px-2 py-1 text-xs capitalize ${settings.quality === q ? "bg-primary text-primary-fg" : "text-muted"}`,
							onClick: () => onChange({ quality: q }),
							children: q
						}, q))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm",
					children: ["Reduce motion", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: settings.reduceMotion,
						onChange: (e) => onChange({ reduceMotion: e.target.checked }),
						className: "accent-primary"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-10 w-full rounded-lg border border-border bg-surface-2 text-sm text-fg",
					onClick: () => {
						const el = document.documentElement;
						if (!document.fullscreenElement) el.requestFullscreen?.();
						else document.exitFullscreen?.();
					},
					children: "Toggle fullscreen"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "pt-2 text-[10px] uppercase tracking-[0.16em] text-subtle",
					children: [
						GAME_TITLE,
						" ",
						GAME_BUILD_VERSION
					]
				})
			]
		})
	] });
}
var SplitComponent = GameApp;
//#endregion
export { SplitComponent as component };
