import React, { useState } from 'react';
import { PlusCircle, Filter, Search, List, Grid } from 'lucide-react';
import { Proposal, ProposalStatus } from '../types/proposal';
import ProposalCard from './ProposalCard';
import CreateProposalModal from './CreateProposalModal';

interface DashboardProps {
  proposals: Proposal[];
  onCreateProposal: (title: string, description: string, votingDeadline: number, tokenAddress: string) => void;
  onViewProposal: (id: number) => void;
  onShareProposal: (id: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  proposals,
  onCreateProposal,
  onViewProposal,
  onShareProposal
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         proposal.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: proposals.length,
    [ProposalStatus.Active]: proposals.filter(p => p.status === ProposalStatus.Active).length,
    [ProposalStatus.Reveal]: proposals.filter(p => p.status === ProposalStatus.Reveal).length,
    [ProposalStatus.Closed]: proposals.filter(p => p.status === ProposalStatus.Closed).length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-accent dark:text-text-primary-dark mb-2">DAO Governance</h1>
          <p className="text-text-secondary dark:text-text-secondary-dark text-lg">Participate in decentralized decision making with privacy</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-accent dark:bg-primary text-white rounded-xl hover:bg-accent/90 dark:hover:bg-primary/90 transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg transform hover:scale-105"
        >
          <PlusCircle size={20} />
          Create Proposal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-xl p-6 transition-all duration-300 hover:shadow-zama">
          <div className="text-3xl font-bold text-accent dark:text-text-primary-dark">{statusCounts.all}</div>
          <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Total Proposals</div>
        </div>
        <div className="bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-xl p-6 transition-all duration-300 hover:shadow-zama">
          <div className="text-3xl font-bold text-primary">{statusCounts[ProposalStatus.Active]}</div>
          <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Active</div>
        </div>
        <div className="bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-xl p-6 transition-all duration-300 hover:shadow-zama">
          <div className="text-3xl font-bold text-info">{statusCounts[ProposalStatus.Reveal]}</div>
          <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Awaiting Resolution</div>
        </div>
        <div className="bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-xl p-6 transition-all duration-300 hover:shadow-zama">
          <div className="text-3xl font-bold text-abstain">{statusCounts[ProposalStatus.Closed]}</div>
          <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Resolved</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted dark:text-text-muted-dark" size={20} />
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 border border-zama-light-orange dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-64 bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark transition-all duration-300"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted dark:text-text-muted-dark" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-3 border border-zama-light-orange dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark transition-all duration-300"
            >
              <option value="all">All Status</option>
              <option value={ProposalStatus.Active}>Active</option>
              <option value={ProposalStatus.Reveal}>Awaiting Resolution</option>
              <option value={ProposalStatus.Closed}>Resolved</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 border border-zama-light-orange dark:border-border-dark rounded-xl p-1 bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm transition-all duration-300">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all duration-300 ${
              viewMode === 'grid' 
                ? 'bg-primary text-white shadow-zama' 
                : 'text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all duration-300 ${
              viewMode === 'list' 
                ? 'bg-primary text-white shadow-zama' 
                : 'text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Proposals */}
      <div className={`
        ${viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
          : 'space-y-4'
        }
      `}>
        {filteredProposals.length > 0 ? (
          filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onView={onViewProposal}
              onShare={onShareProposal}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-16">
            <div className="text-text-muted dark:text-text-muted-dark mb-6">
              <List size={64} className="mx-auto" />
            </div>
            <h3 className="text-xl font-medium text-accent dark:text-text-primary-dark mb-3">No proposals found</h3>
            <p className="text-text-secondary dark:text-text-secondary-dark mb-8 text-lg">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating your first proposal'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent dark:bg-primary text-white rounded-xl hover:bg-accent/90 dark:hover:bg-primary/90 transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg transform hover:scale-105"
              >
                <PlusCircle size={20} />
                Create Proposal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Proposal Modal */}
      <CreateProposalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={onCreateProposal}
      />
    </div>
  );
};

export default Dashboard;