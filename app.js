"use strict";

/**
 * ═══════════════════════════════════════════════════════════════════════
 * GUNDAM TCG TRACKER — Pre-compiled (no Babel needed at runtime)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * A mobile-optimized tracker for the Gundam Trading Card Game.
 *
 * Concepts:
 *   LEVEL (left side)
 *     Your total level, which is the sum of two types of resources:
 *       - Base resources: added/removed with the +1 / -1 buttons
 *       - EX resources:   added with the EX+ button
 *     Both contribute to the single "level" number shown on screen.
 *
 *   ACTIVE RESOURCES (right side)
 *     How many of your resources are currently available to spend.
 *     This number can never exceed your total level.
 *
 * Rules:
 *   - Level +1 adds a base resource and activates all resources
 *     (sets active = level), simulating the start-of-turn flow.
 *   - Level -1 removes a base resource. If no base resources remain,
 *     it removes an EX resource instead. Active resources are capped
 *     to not exceed the new level.
 *   - EX+ adds an EX resource, incrementing both level and active by 1.
 *   - Resource +1 reactivates one spent resource (cannot exceed level).
 *   - Resource -1 spends one active resource. Base resources are spent
 *     first. Once active resources drop below the EX count, we know
 *     all base resources have been spent, so spending now consumes an
 *     EX resource, permanently reducing both level and EX count.
 *   - Activate sets active resources equal to level (full refresh).
 *   - Reset zeroes everything (with confirmation modal).
 */

var e = React.createElement;
var useState = React.useState;
var useRef = React.useRef;

function App() {
  // ── Core game state ────────────────────────────────────────────────
  var _level     = useState(0); var level     = _level[0];     var setLevel     = _level[1];
  var _resources = useState(0); var resources = _resources[0]; var setResources = _resources[1];
  var _exCount   = useState(0); var exCount   = _exCount[0];   var setExCount   = _exCount[1];

  // ── UI state ───────────────────────────────────────────────────────
  var _flashLeft    = useState(false); var flashLeft    = _flashLeft[0];    var setFlashLeft    = _flashLeft[1];
  var _flashRight   = useState(false); var flashRight   = _flashRight[0];   var setFlashRight   = _flashRight[1];
  var _showConfirm  = useState(false); var showConfirm  = _showConfirm[0];  var setShowConfirm  = _showConfirm[1];

  // ── Refs (mirror state for synchronous access in handlers) ─────────
  var levelRef     = useRef(0);
  var resourcesRef = useRef(0);
  var exCountRef   = useRef(0);

  // ── Helpers ────────────────────────────────────────────────────────

  /** Update all three game values atomically. */
  function sync(newLevel, newResources, newEx) {
    levelRef.current     = newLevel;
    resourcesRef.current = newResources;
    exCountRef.current   = newEx;
    setLevel(newLevel);
    setResources(newResources);
    setExCount(newEx);
  }

  /** Trigger a brief scale-pulse animation on a number display. */
  function flash(side) {
    var setter = side === 'left' ? setFlashLeft : setFlashRight;
    setter(false);
    requestAnimationFrame(function() { setter(true); });
    setTimeout(function() { setter(false); }, 160);
  }

  /** Flash both number displays simultaneously. */
  function flashBoth() { flash('left'); flash('right'); }

  // ── Button Handlers ────────────────────────────────────────────────

  /** LEVEL +1: Adds a base resource and activates all resources. */
  function handleLevelUp() {
    var newL = levelRef.current + 1;
    sync(newL, newL, exCountRef.current);
    flashBoth();
  }

  /** LEVEL -1: Removes a base resource (or EX if no base remain). */
  function handleLevelDown() {
    var newL  = Math.max(0, levelRef.current - 1);
    var newR  = Math.min(resourcesRef.current, newL);
    var newEx = Math.min(exCountRef.current, newL);
    sync(newL, newR, newEx);
    flash('left');
  }

  /** EX+: Adds one EX resource (increments level, active, and EX count). */
  function handleExPlus() {
    sync(
      levelRef.current + 1,
      resourcesRef.current + 1,
      exCountRef.current + 1
    );
    flashBoth();
  }

  /** RESOURCE +1: Reactivates one spent resource (cannot exceed level). */
  function handleResUp() {
    if (resourcesRef.current >= levelRef.current) return;
    sync(levelRef.current, resourcesRef.current + 1, exCountRef.current);
    flash('right');
  }

  /**
   * RESOURCE -1: Spends one active resource. Base resources spent first.
   * When active drops below EX count, an EX resource is consumed,
   * permanently reducing level.
   */
  function handleResMinus() {
    if (resourcesRef.current <= 0) return;

    var newR  = resourcesRef.current - 1;
    var newL  = levelRef.current;
    var newEx = exCountRef.current;

    if (newR < newEx && newEx > 0) {
      newL  = Math.max(0, newL - 1);
      newEx = newEx - 1;
      flash('left');
    }

    sync(newL, newR, newEx);
    flash('right');
  }

  /** ACTIVATE: Sets active resources equal to total level. */
  function handleActivate() {
    sync(levelRef.current, levelRef.current, exCountRef.current);
    flash('right');
  }

  /** RESET: Zeroes all state (called after user confirms via modal). */
  function handleReset() {
    sync(0, 0, 0);
    setShowConfirm(false);
  }

  // ── Render ─────────────────────────────────────────────────────────

  return e(React.Fragment, null,

    // Title bar
    e("div", { className: "header" },
      e("h1", null, "Gundam TCG")
    ),

    // Main display: Level | Resources
    e("div", { className: "main" },

      // Left panel — Level
      e("div", { className: "panel panel-left" },
        e("div", { className: "panel-label" }, "Level"),
        e("div", { className: "number-display " + (flashLeft ? "flash" : "") }, level),
        e("div", { className: "ex-badge" }, exCount > 0 ? "EX +" + exCount : "\u00A0")
      ),

      // Center divider
      e("div", { className: "divider" }),

      // Right panel — Active Resources
      e("div", { className: "panel panel-right" },
        e("div", { className: "panel-label" }, "Resources"),
        e("div", { className: "number-display " + (flashRight ? "flash" : "") }, resources),
        e("div", { className: "resource-sub" }, "\u00A0")
      )
    ),

    // Control buttons
    e("div", { className: "controls" },

      // Left column: Level & EX controls
      e("div", { className: "control-col" },
        e("div", { className: "btn-row" },
          e("button", { className: "btn btn-level-plus", onClick: handleLevelUp }, "+ 1"),
          e("button", { className: "btn btn-level-minus", onClick: handleLevelDown }, "\u2212 1")
        ),
        e("button", { className: "btn btn-ex", onClick: handleExPlus }, "EX +")
      ),

      // Right column: Resource controls
      e("div", { className: "control-col" },
        e("div", { className: "btn-row" },
          e("button", { className: "btn btn-res-plus", onClick: handleResUp }, "+ 1"),
          e("button", { className: "btn btn-res-minus", onClick: handleResMinus }, "\u2212 1")
        ),
        e("button", { className: "btn btn-activate", onClick: handleActivate }, "Activate")
      )
    ),

    // Reset button
    e("div", { className: "reset-bar" },
      e("button", { className: "btn-reset", onClick: function() { setShowConfirm(true); } }, "Reset")
    ),

    // Confirmation modal (conditionally rendered)
    showConfirm && e("div", { className: "modal-overlay", onClick: function() { setShowConfirm(false); } },
      e("div", { className: "modal-box", onClick: function(ev) { ev.stopPropagation(); } },
        e("p", null, "Reset the board?"),
        e("div", { className: "modal-buttons" },
          e("button", { className: "modal-confirm", onClick: handleReset }, "Reset"),
          e("button", { className: "modal-cancel", onClick: function() { setShowConfirm(false); } }, "Cancel")
        )
      )
    )
  );
}

// Mount the app
ReactDOM.createRoot(document.getElementById('app')).render(e(App));
