import { Search, SlidersHorizontal } from 'lucide-react';

interface EventFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  categories: string[];
}

export function EventFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedDate,
  onDateChange,
  categories,
}: EventFiltersProps) {
  return (
    <div className="card bg-white/90 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <SlidersHorizontal className="text-indigo-600" size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 ">Filter Events</h2>
        </div>
        
        {(searchQuery || selectedCategory || selectedDate) && (
          <button
            onClick={() => {
              onSearchChange('');
              onCategoryChange('');
              onDateChange('');
            }}
            className="btn-secondary text-sm px-4 py-2"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative">
          <label className="form-label">Search Events</label>
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 
                group-focus-within:text-indigo-600 transition-colors duration-200"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by title, description, or location..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="input-field appearance-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div>
          <label className="form-label">Event Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="input-field cursor-pointer"
          />
        </div>
      </div>

      {(searchQuery || selectedCategory || selectedDate) && (
        <div className="mt-4 px-4 py-3 bg-indigo-50 rounded-lg">
          <p className="text-sm text-indigo-700">
            <span className="font-semibold">Active filters:</span>{' '}
            {[
              searchQuery && `Search: "${searchQuery}"`,
              selectedCategory && `Category: ${selectedCategory}`,
              selectedDate && `Date: ${new Date(selectedDate).toLocaleDateString()}`
            ].filter(Boolean).join(' • ')}
          </p>
        </div>
      )}
    </div>
  );
}
