//Page should Ideally be to show Account details
import Image from "next/image";
import { Montserrat } from "next/font/google";
const montHeading = Montserrat({ subsets: ["latin"], weight: ["600","700"] });

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-start pt-0 px-0 font-sans bg-[#e0dbda]">
      <div className="w-full max-w-3xl">
        <div className="mb-0 flex justify-center">
          <Image
            src="/bookBotics_logo.png"
            alt="BookBotics logo"
            width={500}
            height={100}
            className="mx-auto"
          />
        </div>

        <div className="text-center -mt-8 mb-0 px-0">
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
   
          </h2>
               <p className={`${montHeading.className} mt-1 text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed`}>
                 <span className="block">Automate scheduling,</span>
                 <span className="block">Manage appointments,</span>
                 <span className="block">and streamline your business effortlessly</span>
               </p>
        </div>

        <main className="rounded-[32px] bg-transparent p-0 shadow-none dark:bg-transparent">
        </main>
      </div>
    </div>
  );
}
