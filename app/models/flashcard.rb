class Flashcard < ApplicationRecord
  belongs_to :deck, inverse_of: :flashcards

  validates :term, presence: true, length: { maximum: 500 }
  validates :definition, presence: true, length: { maximum: 500 }
end
