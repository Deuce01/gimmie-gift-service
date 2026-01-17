import { Product } from '@prisma/client';
import { RecommendationService } from '../../services/recommendation.service';

// Mock the repositories
jest.mock('../../repositories/product.repository', () => ({
    productRepository: {
        getRecommendationCandidates: jest.fn(),
    },
}));

jest.mock('../../repositories/event.repository', () => ({
    eventRepository: {
        getUserTopCategory: jest.fn(),
    },
}));

// Mock the AI service
jest.mock('../../services/ai.service', () => ({
    aiService: {
        isAIEnabled: jest.fn().mockReturnValue(false),
        generateBatchExplanations: jest.fn(),
    },
}));

import { productRepository } from '../../repositories/product.repository';
import { eventRepository } from '../../repositories/event.repository';

describe('RecommendationService', () => {
    let service: RecommendationService;

    beforeEach(() => {
        service = new RecommendationService();
        jest.clearAllMocks();
    });

    const mockProducts: Product[] = [
        {
            id: '1',
            title: 'Gaming Keyboard',
            description: 'Mechanical keyboard for gamers',
            price: 80,
            brand: 'GamePro',
            category: 'Electronics',
            retailer: 'TechStore',
            url: 'https://example.com/1',
            imageUrl: null,
            tags: ['gaming', 'tech', 'computer'],
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '2',
            title: 'Coffee Maker',
            description: 'Premium espresso machine',
            price: 150,
            brand: 'BrewMaster',
            category: 'Home',
            retailer: 'HomeGoods',
            url: 'https://example.com/2',
            imageUrl: null,
            tags: ['coffee', 'kitchen', 'home'],
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '3',
            title: 'Birthday Gift Basket',
            description: 'Perfect for birthday celebrations',
            price: 90,
            brand: 'GiftLux',
            category: 'Food',
            retailer: 'GiftShop',
            url: 'https://example.com/3',
            imageUrl: null,
            tags: ['gift', 'birthday', 'food'],
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    describe('getRecommendations', () => {
        it('should return scored products sorted by score', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue(
                mockProducts
            );
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue(null);

            const params = {
                userId: 'user-1',
                budget: 100,
                interests: ['gaming', 'tech'],
            };

            const result = await service.getRecommendations(params);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('score');
            expect(result[0]).toHaveProperty('scoreBreakdown');
            expect(result[0]).toHaveProperty('reason');
        });

        it('should apply interest matching correctly (+10 per match)', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue([
                mockProducts[0],
            ]);
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue(null);

            const params = {
                userId: 'user-1',
                budget: 100,
                interests: ['gaming', 'tech'],
            };

            const result = await service.getRecommendations(params);

            expect(result[0].scoreBreakdown?.interestMatch).toBeGreaterThanOrEqual(10);
        });

        it('should apply budget optimization (+5 for 80-100% of budget)', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue([
                mockProducts[0],
            ]);
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue(null);

            const params = {
                userId: 'user-1',
                budget: 100, // Product is $80, which is 80% of budget
                interests: [],
            };

            const result = await service.getRecommendations(params);

            expect(result[0].scoreBreakdown?.budgetOptimization).toBe(5);
        });

        it('should apply occasion matching (+5 for keyword match)', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue([
                mockProducts[2],
            ]);
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue(null);

            const params = {
                userId: 'user-1',
                budget: 100,
                interests: [],
                occasion: 'birthday',
            };

            const result = await service.getRecommendations(params);

            expect(result[0].scoreBreakdown?.occasionMatch).toBe(5);
        });

        it('should apply relationship matching (+5 for category match)', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue([
                mockProducts[0], // Electronics - good for friends
            ]);
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue(null);

            const params = {
                userId: 'user-1',
                budget: 100,
                interests: [],
                relationship: 'friend' as const,
            };

            const result = await service.getRecommendations(params);

            expect(result[0].scoreBreakdown?.relationshipMatch).toBe(5);
        });

        it('should apply learning boost (+15 for top category match)', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue([
                mockProducts[0],
            ]);
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue({
                category: 'Electronics',
                count: 10,
            });

            const params = {
                userId: 'user-1',
                budget: 100,
                interests: [],
            };

            const result = await service.getRecommendations(params);

            expect(result[0].scoreBreakdown?.learningBoost).toBe(15);
        });

        it('should return empty array when no candidates found', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue([]);
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue(null);

            const params = {
                userId: 'user-1',
                budget: 100,
                interests: ['gaming'],
            };

            const result = await service.getRecommendations(params);

            expect(result).toEqual([]);
        });

        it('should respect limit parameter', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue(
                mockProducts
            );
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue(null);

            const params = {
                userId: 'user-1',
                budget: 200,
                interests: [],
            };

            const result = await service.getRecommendations(params, 2);

            expect(result.length).toBeLessThanOrEqual(2);
        });

        it('should support recipientAge field', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue(
                mockProducts
            );
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue(null);

            const params = {
                userId: 'user-1',
                budget: 100,
                interests: ['gaming'],
                recipientAge: 25,
            };

            const result = await service.getRecommendations(params);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle edge case: zero budget', async () => {
            (productRepository.getRecommendationCandidates as jest.Mock).mockResolvedValue([]);
            (eventRepository.getUserTopCategory as jest.Mock).mockResolvedValue(null);

            const params = {
                userId: 'user-1',
                budget: 0,
                interests: [],
            };

            const result = await service.getRecommendations(params);

            expect(result).toEqual([]);
        });
    });
});
