import { useEffect } from "react";

// On phones the side rail becomes a sideways-scrolling tab bar, so keep the current tab in view
// whenever the page changes (otherwise it can sit off-screen and nothing looks selected).
export function useActiveTabInView(activeTab) {
  useEffect(() => {
    document.querySelector(".student-rail .student-rail-link.active, .mentor-nav button.active")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeTab]);
}
