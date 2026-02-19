import { Link } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Department } from '../lib/supabase';

interface DepartmentCardProps {
  department: Department;
}

export function DepartmentCard({ department }: DepartmentCardProps) {
  return (
    <Link
      to={`/department/${department.code}`}
      className="card group cursor-pointer overflow-hidden hover:border-indigo-200 flex flex-col h-full w-full"
    >
      <div className="h-32 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 -mx-6 -mt-6 mb-4">
        {department.image_url ? (
          <img
            src={department.image_url}
            alt={department.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Building2 size={48} className="text-white/80" />
        )}
      </div>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {department.code}
          </span>
          <h3 className="text-lg font-bold text-gray-900 mt-2 group-hover:text-indigo-600 transition-colors">
            {department.name}
          </h3>
          {department.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{department.description}</p>
          )}
        </div>
        <ArrowRight
          size={20}
          className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all mt-6 flex-shrink-0"
        />
      </div>
    </Link>
  );
}
