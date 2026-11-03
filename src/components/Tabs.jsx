import { useContext, useState } from "react";
import TabHebrew from "./TabHebrew";
import LanguageContext from "../context/LanguageContext";
import TabGreek from "./TabGreek";

const Tabs = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { t } = useContext(LanguageContext);

  const changeTab = (index) => {
    setActiveTab(index);
  };

  return (
    <>
      <div className="sticky top-0 z-30 -mt-1 bg-superficie pb-2 pt-1">
        <div className="flex gap-1 rounded-lg bg-tinta/5 p-0.5">
          <div
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors sm:px-4 ${
              activeTab === 0 ? "bg-superficie font-medium text-tinta shadow-sm" : "text-tinta-2 hover:text-tinta"
            }`}
            onClick={() => changeTab(0)}
          >
            <span>{t("Hebreo")}</span>
            <span className="rounded-full bg-acento-suave px-2 py-0.5 text-[11px] font-medium text-acento">
              {t("StrongHebreoCount")}
            </span>
          </div>
          <div
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors sm:px-4 ${
              activeTab === 1 ? "bg-superficie font-medium text-tinta shadow-sm" : "text-tinta-2 hover:text-tinta"
            }`}
            onClick={() => changeTab(1)}
          >
            <span>{t("Griego")}</span>
            <span className="rounded-full bg-acento-suave px-2 py-0.5 text-[11px] font-medium text-acento">
              {t("StrongGriegoCount")}
            </span>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {activeTab === 0 && <TabHebrew />}
        {activeTab === 1 && <TabGreek />}
        {/* {activeTab === 2 && <div>{t("Cognados")}</div>} */}
      </div>
    </>
  );
};

export default Tabs;
