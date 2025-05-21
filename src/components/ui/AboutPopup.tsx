import React from 'react';
import { X, Globe, ArrowRight, Zap, Eye, CheckCircle, Lightbulb, Shield, Briefcase, Scale, CircleDot } from "lucide-react";

interface AboutPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutPopup: React.FC<AboutPopupProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click is directly on the backdrop itself
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white dark:bg-dark-150 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Close Button - Moved inside the card */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/80 hover:bg-white dark:bg-dark-100/80 dark:hover:bg-dark-100 shadow-md transition-all"
        >
          <X className="w-6 h-6 text-orange-500 dark:text-orange-400" />
        </button>

        {/* Hero Section */}
        <div className="relative h-[30vh] bg-white dark:bg-dark-150 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5 bg-cover bg-center" />
          <div className="container mx-auto px-4 h-full flex flex-col justify-center items-center relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <h1 className="text-4xl md:text-5xl font-extrabold text-orange-500 dark:text-orange-400 tracking-tight">ABOUT</h1>
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AMP%20Logo-FdmXGeXuGBlr2AcoAFFlM8AqzmoyM1.png"
                alt="AMP Logo"
                className="h-12"
              />
            </div>
            <p className="text-orange-500 dark:text-orange-400 text-lg max-w-2xl text-center">
              Excellence in service, guided by faith, driven by integrity
            </p>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="py-12 bg-white dark:bg-dark-150">
          <div className="container mx-auto px-4">
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-orange-50 dark:bg-dark-200 rounded-full border border-orange-200 dark:border-dark-300">
                <Zap className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                <span className="text-orange-600 dark:text-orange-400 font-semibold tracking-wide">OUR CORE VALUES</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Purpose */}
              <div className="bg-white dark:bg-dark-100 p-6 rounded-2xl border border-orange-100 dark:border-dark-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2">PURPOSE</h3>
                <p className="text-gray-700 dark:text-dark-400 text-sm leading-relaxed">
                  Committed to extraordinary quality while exhibiting servant leadership exceeding our clients' objectives of safety and reliability.
                </p>
              </div>

              {/* Mission */}
              <div className="bg-white dark:bg-dark-100 p-6 rounded-2xl border border-orange-100 dark:border-dark-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <ArrowRight className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2">MISSION</h3>
                <p className="text-gray-700 dark:text-dark-400 text-sm leading-relaxed">
                  To further the gospel while sustaining exceptional employment, and providing quality services to the energy industry.
                </p>
              </div>

              {/* Attentiveness */}
              <div className="bg-white dark:bg-dark-100 p-6 rounded-2xl border border-orange-100 dark:border-dark-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2">ATTENTIVENESS</h3>
                <p className="text-gray-700 dark:text-dark-400 text-sm leading-relaxed">
                  Showing the worth of a person or task by giving our undivided concentration.
                </p>
              </div>

              {/* Commitment */}
              <div className="bg-white dark:bg-dark-100 p-6 rounded-2xl border border-orange-100 dark:border-dark-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2">COMMITMENT</h3>
                <p className="text-gray-700 dark:text-dark-400 text-sm leading-relaxed">
                  Devoting ourselves to following up on our word with action.
                </p>
              </div>

              {/* Creativity */}
              <div className="bg-white dark:bg-dark-100 p-6 rounded-2xl border border-orange-100 dark:border-dark-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <Lightbulb className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2">CREATIVITY</h3>
                <p className="text-gray-700 dark:text-dark-400 text-sm leading-relaxed">
                  Approaching a need, a task or an idea from a new perspective.
                </p>
              </div>

              {/* Dependability */}
              <div className="bg-white dark:bg-dark-100 p-6 rounded-2xl border border-orange-100 dark:border-dark-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2">DEPENDABILITY</h3>
                <p className="text-gray-700 dark:text-dark-400 text-sm leading-relaxed">
                  Fulfilling what we consented to do even if it means unexpected sacrifice.
                </p>
              </div>

              {/* Diligence */}
              <div className="bg-white dark:bg-dark-100 p-6 rounded-2xl border border-orange-100 dark:border-dark-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2">DILIGENCE</h3>
                <p className="text-gray-700 dark:text-dark-400 text-sm leading-relaxed">
                  Treating each task as unique and giving our full effort to achieve excellence.
                </p>
              </div>

              {/* Integrity */}
              <div className="bg-white dark:bg-dark-100 p-6 rounded-2xl border border-orange-100 dark:border-dark-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <Scale className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2">INTEGRITY</h3>
                <p className="text-gray-700 dark:text-dark-400 text-sm leading-relaxed">
                  Upholding moral and ethical principles to remain whole and complete.
                </p>
              </div>

              {/* Poise */}
              <div className="bg-white dark:bg-dark-100 p-6 rounded-2xl border border-orange-100 dark:border-dark-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <CircleDot className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2">POISE</h3>
                <p className="text-gray-700 dark:text-dark-400 text-sm leading-relaxed">
                  Being totally balanced in mind, body, and spirit.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Who We Are Section */}
        <div className="py-12 bg-orange-50 dark:bg-dark-200">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-dark-300 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Zap className="w-8 h-8 text-orange-500 dark:text-orange-400" />
              </div>
              <h2 className="text-3xl font-bold text-orange-500 dark:text-orange-400 mb-6">WHO WE ARE</h2>
              <p className="text-gray-700 dark:text-dark-400 leading-relaxed">
                We believe that as a company, it is our privilege and responsibility to serve and honor God in how we
                conduct our business. That means that we are going to take care of our employees and their families. That
                also means that we are going to exceed our clients' expectations and treat them with fairness, respect,
                and integrity.
              </p>
            </div>
          </div>
        </div>

        {/* Our Story Section */}
        <div className="py-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5 bg-cover bg-center" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto bg-white dark:bg-dark-100 rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-orange-500 dark:bg-orange-600 py-6 px-8">
                <h2 className="text-3xl font-bold text-white text-center">OUR STORY</h2>
              </div>
              <div className="p-8">
                <div className="prose prose-orange dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-dark-400">
                    In 2009, our founder, Brian, felt called to step out in faith and start a new venture. With the
                    support of his wife, he left his previous role and launched AMP, but the road wasn't easy. On his
                    first day, he faced unexpected transitions, financial uncertainty, and even a car accident. Yet,
                    within days, opportunities began to emerge.
                  </p>
                  <p className="text-gray-700 dark:text-dark-400">
                    A former customer reached out, insisting on working with Brian directly. With no equipment and just
                    one employee, AMP took on its first project, marking the start of our journey. From those early
                    challenges, AMP grew through hard work, determination, and faith. Our first job's success laid the
                    foundation for growth, but the path wasn't always smooth.
                  </p>
                  <p className="text-gray-700 dark:text-dark-400">
                    In 2015, a downturn brought significant challenges, leaving Brian as the sole employee. However,
                    through perseverance, careful planning, and the support of trusted advisors, AMP rebuilt stronger than
                    ever.
                  </p>
                  <p className="text-gray-700 dark:text-dark-400">
                    Today, AMP has grown into a thriving company with a dedicated team. Over the past several years, we've
                    experienced substantial growth and continue to thrive, guided by our commitment to faith, integrity,
                    and service.
                  </p>
                  <p className="text-gray-700 dark:text-dark-400">
                    Through every challenge and triumph, AMP's story is one of resilience, community, and faith. We are
                    grateful to our team, customers, and the support systems that have shaped our journey. At AMP, we
                    believe that no matter the business, we're in the people business.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 