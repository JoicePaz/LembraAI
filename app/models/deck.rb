class Deck < ApplicationRecord
  has_many :flashcards, -> { order(:position, :id) }, dependent: :destroy, inverse_of: :deck
  accepts_nested_attributes_for :flashcards,
                                reject_if: ->(attrs) { attrs["term"].blank? && attrs["definition"].blank? },
                                allow_destroy: true

  validates :title, presence: true, length: { maximum: 80 }
  validates :description, length: { maximum: 500 }, allow_blank: true
  validates :owner_token, presence: true, length: { maximum: 64 }, if: :owner_token_attribute?
  validate :must_have_at_least_one_flashcard

  private

  def must_have_at_least_one_flashcard
    active_flashcards = flashcards.reject(&:marked_for_destruction?)
    return if active_flashcards.any?

    errors.add(:base, "At least one flashcard is required")
  end

  def owner_token_attribute?
    has_attribute?(:owner_token)
  end
end
