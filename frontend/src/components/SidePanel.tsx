// import { useState } from 'react';
// import { Plus, Clock, Copy, MoreHorizontal, AtSign, Search, Bell } from 'lucide-react';
// import type { JSX } from 'react/jsx-runtime';
// import type { TreeNode } from '../PlaygroundPanel';
// import axios from 'axios';
// interface SidePanelProps {
//   root : {path:string, children:TreeNode[]} | undefined;
// }

// export default function SidePanel({root}:SidePanelProps) :JSX.Element{
//   const [userQuery, setUserQuery] = useState(['hii']);
//   const [inputValue, setInputValue] = useState('');
//   const apiBase = (import.meta as any)?.env?.VITE_API_BASE_URL || (window as any)?.API_BASE_URL || 'https://codemesher.onrender.com';


//   /* Step 1  */
//   const fetchRequiredFiles = async () => {
//     if (!inputValue.trim()) {
//       return;
//     }
//     try {
//       const res = await axios.post(`${apiBase}/user-query`, {
//         userQuery : userQuery,
//         root:root,
//       });
//       if(res.data.success){
//         setUserQuery((prev) => [...prev, inputValue]);
//         setInputValue("");
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   return (
//     <div className="flex flex-col h-screen bg-[#1a1a1a] text-gray-200">
//       {/* Header */}
//       <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
//         <h1 className="text-[15px] font-medium">Casual userQuery</h1>
//         <div className="flex items-center gap-3">
//           <button className="text-gray-500 hover:text-gray-300 transition-colors">
//             <Plus size={18} />
//           </button>
//           <button className="text-gray-500 hover:text-gray-300 transition-colors">
//             <Clock size={18} />
//           </button>
//           <button className="text-gray-500 hover:text-gray-300 transition-colors">
//             <Copy size={18} />
//           </button>
//           <button className="text-gray-500 hover:text-gray-300 transition-colors">
//             <MoreHorizontal size={18} />
//           </button>
//         </div>
//       </div>

//       {/* Content Area */}
//       <div className="flex-1 overflow-y-auto">
//         <div className="p-5">
//           {userQuery.map((greeting, index) => (
//             <div
//               key={index}
//               className="mb-3 px-4 py-3 bg-[#2a2a2a] rounded-lg hover:bg-[#333] transition-colors cursor-pointer"
//             >
//               {greeting}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Bottom Input Area */}
//       <div className="border-t border-[#2a2a2a] p-4">
//         <div className="flex items-center gap-2 mb-3">
//           <button className="text-gray-500 hover:text-gray-300 transition-colors p-2">
//             <AtSign size={18} />
//           </button>
//           <button className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
//             <Plus size={16} />
//             <span className="text-sm">Browser</span>
//           </button>
//         </div>
        
//         <input
//           type="text"
//           value={inputValue}
//           onChange={(e) => setInputValue(e.target.value)}
//           onKeyPress={(e) => e.key === 'Enter' && fetchRequiredFiles()}
//           placeholder="Plan, search, build anything"
//           className="w-full bg-transparent border-none outline-none text-gray-400 text-sm mb-3"
//         />

//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <div className="flex items-center gap-1 text-xs text-gray-500">
//               <div className="w-4 h-4 rounded border border-gray-600 flex items-center justify-center">
//                 <span className="text-[10px]">∞</span>
//               </div>
//               <span>Ctrl+I</span>
//             </div>
//             <div className="flex items-center gap-1 text-xs text-gray-500">
//               <span>Auto</span>
//               <span>^</span>
//             </div>
//           </div>
          
//           <div className="flex items-center gap-3">
//             <button className="text-gray-500 hover:text-gray-300 transition-colors">
//               <Copy size={16} />
//             </button>
//             <button className="text-gray-500 hover:text-gray-300 transition-colors">
//               <Plus size={16} />
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Footer Bar */}
//       <div className="flex items-center justify-center gap-6 py-3 border-t border-[#2a2a2a] text-xs text-gray-500">
//         <span>Cursor Tab</span>
//         <button className="hover:text-gray-300 transition-colors">
//           <Search size={16} />
//         </button>
//         <button className="hover:text-gray-300 transition-colors">
//           <Bell size={16} />
//         </button>
//       </div>
//     </div>
//   );
// }